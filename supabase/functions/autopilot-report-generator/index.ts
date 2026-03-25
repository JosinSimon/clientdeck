import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase Client with Service Role Key for Admin Access
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Google Gemini API Key
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function calculateNextRunTimestamp(cadence: string, previousRunAt: string): string {
  const nextDate = previousRunAt ? new Date(previousRunAt) : new Date();
  const parts = cadence.split(' at ');
  const frequency = parts[0];

  // Increment the UTC timestamp forward by exactly one schedule period
  if (frequency === '1st of Month' || frequency === '15th of Month') {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
  } else if (frequency === 'Every Monday') {
    nextDate.setUTCDate(nextDate.getUTCDate() + 7);
  } else if (frequency === 'Last Friday') {
    nextDate.setUTCDate(nextDate.getUTCDate() + 28);
  } else {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + 1);
  }
  return nextDate.toISOString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse body once — applies to both cron and UI-triggered runs
    let body: any = {};
    try { body = await req.json(); } catch (e) { /* cron sends empty body */ }

    // Unified client identification (App.jsx sends clientId, cron might send forceRunClientId)
    const targetClientId = body.clientId || body.forceRunClientId || null;
    const authHeader = req.headers.get('Authorization');

    console.log(`Run Triggered. targetClientId: ${targetClientId}, hasAuth: ${!!authHeader}`);

    // --- CASE 1: ON-DEMAND AI GENERATION (Triggered from UI Reports Menu) ---
    // If we have clientId AND (rawData OR uploadFile OR additionalInstructions), this is a generation request.
    console.log("Request Body Received:", JSON.stringify(body, null, 2));

    // Refined Case Detection: Explicitly check for manual vs autopilot
    const isManual = body.manualGeneration === true || (body.clientId && !body.isAutopilot);
    const isAutopilot = body.isAutopilot === true;

    if (isManual) {
      console.log(`AI Generation requested for Client ${body.clientId} by User ${body.userId}`);
      
      const userId = body.userId;
      if (!userId) throw new Error("userId is required for AI generation.");
      
      if (!body.clientId) throw new Error("clientId is required for manual AI generation.");
      if (!(body.rawData || body.uploadFile || body.additionalInstructions)) {
        throw new Error("Missing content: Please provide raw data, a file, or instructions.");
      }

      // 1. Fetch User Settings to see if they have their own Gemini API Key
      const { data: settings } = await supabase
        .from('user_settings')
        .select('integrations')
        .eq('user_id', userId)
        .single();
      
      const userGeminiKey = settings?.integrations?.geminiApiKey;
      const activeApiKey = userGeminiKey || GEMINI_API_KEY;

      if (!activeApiKey) {
        throw new Error("No Gemini API Key found (neither user-specific nor system-wide).");
      }

      const { rawData, uploadFile, additionalInstructions } = body;
      
      // Construct the prompt for Gemini
      let prompt = `You are an expert business consultant. Analyze the following data and generate a professional, comprehensive monthly report for a client.\n\n`;
      if (additionalInstructions) {
        prompt += `Instructions: ${additionalInstructions}\n\n`;
      }
      
      const contents: any[] = [];
      const parts: any[] = [{ text: prompt }];

      if (rawData) {
        parts.push({ text: `DATA TO ANALYZE:\n${rawData}` });
      }

      if (uploadFile && uploadFile.data) {
        parts.push({
          inlineData: {
            mimeType: uploadFile.mimeType || "application/pdf",
            data: uploadFile.data // base64 string
          }
        });
      }

      contents.push({ role: 'user', parts });

      // Call Gemini 1.5 Flash API (Using -latest alias for maximum compatibility)
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${activeApiKey}`;
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = response.statusText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.message || errorMessage;
        } catch (e) { /* use statusText */ }
        
        console.error(`Gemini API Error: ${response.status}`, errorText);
        throw new Error(`AI Generation failed (${response.status}): ${errorMessage}`);
      }

      const result = await response.json();
      const generatedContent = result.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate content.";

      return new Response(JSON.stringify({ content: generatedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // --- CASE 2: AUTOPILOT DELIVERY & CRON RUNS ---
    // Security: UI-triggered runs (with targetClientId) allowed if valid auth
    if (!targetClientId) {
      const cronSecret = Deno.env.get('CRON_SECRET');
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
      const isAuthorized = authHeader === `Bearer ${cronSecret}` || authHeader === `Bearer ${anonKey}`;
      
      if (!isAuthorized) {
        console.error("Unauthorized autopilot attempt (Invalid credentials).");
        return new Response(JSON.stringify({ 
          error: 'Unauthorized: Invalid credentials for scheduled task.',
          receivedBody: { ...body, uploadFile: body.uploadFile ? 'present' : 'absent' }
        }), { status: 401, headers: corsHeaders });
      }
    }

    const nowUTC = new Date().toISOString();

    // Query tasks — include report_id
    let query = supabase
      .from('autopilot_configs')
      .select('id, user_id, client_id, cadence, next_run_at, report_id')
      .eq('enabled', true);

    if (targetClientId) {
      query = query.eq('client_id', targetClientId);
    } else {
      query = query.lte('next_run_at', nowUTC);
    }

    const { data: autopilotTasks, error: fetchError } = await query;

    if (fetchError) throw fetchError;
    if (!autopilotTasks || autopilotTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No autopilot tasks due to run." }), { status: 200, headers: corsHeaders });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173';
    let emailsSent = 0;

    for (const task of autopilotTasks) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(task.user_id);
        const ownerEmail = userData?.user?.email || Deno.env.get('NOTIFY_EMAIL');
        if (!ownerEmail) continue;

        const { data: client } = await supabase.from('clients').select('name').eq('id', task.client_id).single();
        const clientName = client?.name || `Client ${task.client_id}`;

        if (!task.report_id) continue;
        const { data: report } = await supabase.from('reports').select('month, content, ai_summary, status').eq('id', task.report_id).single();
        if (!report) continue;

        const typePrefix = body.forceRunClientId ? '[Preview] ' : '';
        const subject = `${typePrefix}📋 Report Ready for Review: ${clientName} — ${report.month}`;
        const reviewUrl = `${APP_URL}`;
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
            <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #1e293b, #3730a3); padding: 32px 32px 24px; color: white;">
                <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7;">Autopilot Delivery</p>
                <h1 style="margin: 0; font-size: 22px; font-weight: 700;">${clientName} — ${report.month}</h1>
                <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Your scheduled report is ready for your review.</p>
              </div>
              <div style="padding: 32px;">
                <p style="color: #475569; font-size: 14px; margin: 0 0 16px;"><strong>AI Summary:</strong> ${report.ai_summary || 'See full report below.'}</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 14px; line-height: 1.7; color: #334155; white-space: pre-wrap; max-height: 400px; overflow: hidden;">${(report.content || '').substring(0, 1500)}${(report.content || '').length > 1500 ? '\n\n... [See full report in app]' : ''}</div>
                <div style="margin-top: 24px; text-align: center;">
                  <a href="${reviewUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px;">Review & Approve in App →</a>
                </div>
              </div>
            </div>
          </div>
        `;

        if (resendApiKey) {
          const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'onboarding@resend.dev', to: ownerEmail, subject, html: emailHtml })
          });
          if (resendRes.ok) emailsSent++;
        }

        if (!body.forceRunClientId && !body.clientId && task.next_run_at) {
          const nextRunAt = calculateNextRunTimestamp(task.cadence, task.next_run_at);
          await supabase.from('autopilot_configs').update({ next_run_at: nextRunAt }).eq('id', task.id);
        }

      } catch (taskErr) {
        console.error(`Error processing task ${task.id}:`, taskErr);
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("Critical Error:", error);
    const status = (error.message && error.message.includes('AI Generation failed')) ? 400 : 500;
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: status
    });
  }
});
