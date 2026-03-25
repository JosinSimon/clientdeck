import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Users, FolderKanban, Receipt, BellRing, Settings, 
  Search, Plus, Bell, MoreVertical, Calendar, FileSignature, Timer, Play, Square,
  CheckCircle2, Clock, AlertCircle, ArrowLeft, Building2, Mail, Phone,
  FileText, X, Trash2, Menu, DollarSign, Hourglass, BarChart2, Globe, Bot, Link, Send, Eye, Sparkles, Copy, UploadCloud, Save, GripVertical,
  Wand2, FileBarChart, RefreshCw, Database, LineChart, LayoutTemplate, Download, Folder,
  CreditCard, MessageSquare, Megaphone, Palette, Image as ImageIcon, UserPlus, Shield, LogOut, HelpCircle, Check,
  Lock, AlertTriangle, ExternalLink, Key, ShieldCheck, Edit2, Loader2
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';

// --- REUSABLE COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6" />
    </div>
    <div>
      <h4 className="text-slate-500 font-medium text-xs md:text-sm mb-1">{title}</h4>
      <div className="text-2xl md:text-3xl font-extrabold text-slate-900 truncate">{value}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    'Active': 'bg-green-100 text-green-700 border-green-200',
    'Accepted': 'bg-green-100 text-green-700 border-green-200',
    'Published': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Completed': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Paid': 'bg-green-100 text-green-700 border-green-200',
    'Lead': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unbilled': 'bg-amber-100 text-amber-700 border-amber-200',
    'Pending': 'bg-amber-100 text-amber-700 border-amber-200',
    'Pending Approval': 'bg-amber-100 text-amber-700 border-amber-200',
    'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
    'Past': 'bg-slate-100 text-slate-700 border-slate-200',
    'Not Started': 'bg-slate-100 text-slate-600 border-slate-200',
    'Billed': 'bg-slate-100 text-slate-500 border-slate-200',
    'Sent': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Review': 'bg-purple-100 text-purple-700 border-purple-200',
    'Overdue': 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles['Draft']}`}>
      {status}
    </span>
  );
};

// --- MAIN APPLICATION ENTRY ---
export default function App() {
  // --- AUTH STATE ---
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Portal View States
  const [isPortalView, setIsPortalView] = useState(false);
  const [activePortal, setActivePortal] = useState(null);
  const [portalClient, setPortalClient] = useState(null);
  const [portalReports, setPortalReports] = useState([]);
  const [portalInvoices, setPortalInvoices] = useState([]);
  const [portalFiles, setPortalFiles] = useState([]);
  const [portalProjects, setPortalProjects] = useState([]);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsTab, setSettingsTab] = useState('profile');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [reports, setReports] = useState([]);
  const [portals, setPortals] = useState([]);
  const [autopilotConfigs, setAutopilotConfigs] = useState([]);
  const [files, setFiles] = useState([]);

  // Settings State
  const [profile, setProfile] = useState({ name: '', email: '', avatar: null });
  const [business, setBusiness] = useState({ name: '', currency: 'USD ($)' });
  const [branding, setBranding] = useState({ color: '#2563eb', domain: '', logo: null });
  const [integrations, setIntegrations] = useState({ stripe: false, slack: false, analytics: false, meta: false, geminiApiKey: '' });
  const [teamMembers, setTeamMembers] = useState([]);
  const [notificationPrefs, setNotificationPrefs] = useState({ invoicePaid: true, portalViewed: true, proposalSigned: true, dailyDigest: false, marketingEmails: false });
  const [billingHistory, setBillingHistory] = useState([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // --- AUTH LISTENER ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- CLIENT PORTAL DETECTION & LOADER ---
  useEffect(() => {
    const checkPortalPath = async () => {
      const path = window.location.pathname;
      if (path.includes('/portal/')) {
        const hash = path.split('/portal/')[1]?.split('/')[0];
        if (hash) {
          setIsPortalView(true);
          setPortalLoading(true);
          try {
            // 1. Find portal by matching the end of the URL (the hash part)
            const { data: portal, error: pErr } = await supabase
              .from('portals')
              .select('*')
              .ilike('url', `%${hash}`)
              .eq('status', 'Active')
              .single();

            if (pErr || !portal) throw new Error("Portal not found or inactive.");

            setActivePortal(portal);

            // 2. Fetch Client Info
            const { data: client } = await supabase.from('clients').select('*').eq('id', portal.client_id).single();
            setPortalClient(client);

            // 3. Fetch Related Data (Strictly filtered by client_id and status)
            const [rResp, iResp, fResp, pResp] = await Promise.all([
              supabase.from('reports').select('*').eq('client_id', portal.client_id).eq('status', 'Published').order('created_at', { ascending: false }),
              supabase.from('invoices').select('*').eq('client_id', portal.client_id).order('date', { ascending: false }),
              supabase.from('client_files').select('*').eq('client_id', portal.client_id).order('created_at', { ascending: false }),
              supabase.from('projects').select('*').eq('client_id', portal.client_id).order('created_at', { ascending: false })
            ]);

            setPortalReports((rResp.data || []).map(r => ({ id: r.id, clientId: r.client_id, month: r.month, status: r.status, aiSummary: r.ai_summary, content: r.content, rawData: r.raw_data })));
            setPortalInvoices((iResp.data || []).map(i => ({ id: i.id, clientId: i.client_id, amount: parseFloat(i.amount) || 0, status: i.status, date: i.date, due: i.due, lineItems: i.line_items || [], tax: parseFloat(i.tax) || 0, notes: i.notes })));
            setPortalFiles((fResp.data || []).map(f => ({ id: f.id, clientId: f.client_id, name: f.name, size: f.size, storagePath: f.storage_path, uploader: f.uploader, date: f.date })));
            setPortalProjects((pResp.data || []).map(p => ({ id: p.id, clientId: p.client_id, name: p.name, status: p.status, budget: parseFloat(p.budget) || 0, deadline: p.deadline, progress: p.progress || 0 })));

          } catch (err) {
            console.error("Portal Load Error:", err);
            setPortalError(err.message);
          } finally {
            setPortalLoading(false);
          }
        }
      }
    };
    checkPortalPath();
  }, []);

  // --- SUPABASE DATA LOADER ---
  const loadAllData = useCallback(async (userId) => {
    setDataLoading(true);
    try {
      const [
        { data: dbClients },
        { data: dbProjects },
        { data: dbTasks },
        { data: dbInvoices },
        { data: dbProposals },
        { data: dbTimeEntries },
        { data: dbReports },
        { data: dbReminders },
        { data: dbPortals },
        { data: dbFiles },
        { data: dbAutopilot },
        { data: dbTeam },
        { data: dbSettings },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('proposals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('time_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('reminders').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('portals').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('client_files').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('autopilot_configs').select('*').eq('user_id', userId),
        supabase.from('team_members').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
      ]);

      // Map DB snake_case → JS camelCase
      setClients((dbClients || []).map(c => ({ id: c.id, name: c.name, contact: c.contact, email: c.email, status: c.status, phone: c.phone, notes: c.notes, billed: 0, projects: 0 })));
      setProjects((dbProjects || []).map(p => ({ id: p.id, clientId: p.client_id, name: p.name, status: p.status, budget: parseFloat(p.budget) || 0, deadline: p.deadline, progress: p.progress })));
      setTasks((dbTasks || []).map(t => ({ id: t.id, projectId: t.project_id, title: t.title, status: t.status, dueDate: t.due_date, assignee: t.assignee })));
      setInvoices((dbInvoices || []).map(i => ({ id: i.id, clientId: i.client_id, amount: parseFloat(i.amount) || 0, status: i.status, date: i.date, due: i.due, lineItems: i.line_items || [], tax: parseFloat(i.tax) || 0, notes: i.notes, recurring: i.recurring })));
      setProposals((dbProposals || []).map(p => ({ id: p.id, clientId: p.client_id, title: p.title, value: parseFloat(p.value) || 0, status: p.status, date: p.date, introduction: p.introduction, deliverables: p.deliverables || [], timeline: p.timeline, paymentTerms: p.payment_terms, scopeOfWork: p.scope_of_work })));
      setTimeEntries((dbTimeEntries || []).map(t => ({ id: t.id, projectId: t.project_id, task: t.task, duration: t.duration, date: t.date, status: t.status })));
      setReports((dbReports || []).map(r => ({ id: r.id, clientId: r.client_id, month: r.month, status: r.status, aiSummary: r.ai_summary, content: r.content, rawData: r.raw_data })));
      setReminders((dbReminders || []).map(r => ({ id: r.id, text: r.text, date: r.date, type: r.type })));
      setPortals((dbPortals || []).map(p => ({ id: p.id, clientId: p.client_id, url: p.url, lastAccessed: p.last_accessed, status: p.status, permissions: p.permissions || {} })));
      setFiles((dbFiles || []).map(f => ({ id: f.id, clientId: f.client_id, name: f.name, size: f.size, storagePath: f.storage_path, uploader: f.uploader, date: f.date })));
      setAutopilotConfigs((dbAutopilot || []).map(a => ({ id: a.id, clientId: a.client_id, enabled: a.enabled, cadence: a.cadence, next_run_at: a.next_run_at, report_id: a.report_id })));
      setTeamMembers((dbTeam || []).map(t => ({ id: t.id, name: t.name, email: t.email, role: t.role, status: t.status })));

      if (dbSettings) {
        setProfile(dbSettings.profile || { name: '', email: '', avatar: null });
        setBusiness(dbSettings.business || { name: '', currency: 'USD ($)' });
        setBranding(dbSettings.branding || { color: '#2563eb', domain: '', logo: null });
        setIntegrations(dbSettings.integrations || { stripe: false, slack: false, analytics: false, meta: false, geminiApiKey: '' });
        setNotificationPrefs(dbSettings.notification_prefs || { invoicePaid: true, portalViewed: true, proposalSigned: true, dailyDigest: false, marketingEmails: false });
        setBillingHistory(dbSettings.billing_history || []);
        setIs2FAEnabled(dbSettings.is_2fa_enabled || false);
      }
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Fetch data when session is available
  useEffect(() => {
    if (session?.user?.id) {
      loadAllData(session.user.id);
    }
  }, [session, loadAllData]);

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setAuthError('success:Check your email for a confirmation link! If you don\'t see it, check your spam folder.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setClients([]); setProjects([]); setTasks([]); setInvoices([]);
    setReminders([]); setProposals([]); setTimeEntries([]); setReports([]);
    setPortals([]); setAutopilotConfigs([]); setFiles([]); setTeamMembers([]);
  };

  // Header States
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState([
    { id: 1, title: 'Invoice Paid', desc: 'Acme Corp paid Invoice #INV-042', time: '10 mins ago', read: false, icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 2, title: 'Portal Accessed', desc: 'Stark Industries viewed their portal', time: '1 hour ago', read: false, icon: Globe, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 3, title: 'Proposal Signed', desc: 'Phase 2: E-commerce approved', time: '2 hours ago', read: true, icon: FileSignature, color: 'text-indigo-500', bg: 'bg-indigo-50' }
  ]);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilterStatus, setProjectFilterStatus] = useState('All');
  const [projectSortBy, setProjectSortBy] = useState('Newest First');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', contact: '', email: '', phone: '', status: 'Lead', notes: '' });

  // Global Notification
  const [notification, setNotification] = useState(null);

  // Modals
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("You are an expert consultant. Summarize the provided metrics into a professional, easy-to-read client report.");
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [newPortalClient, setNewPortalClient] = useState("");
  const [copyFeedbackId, setCopyFeedbackId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Settings Modals
  const [isInviteMemberOpen, setIsInviteMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', role: 'Editor' });
  const [openTeamMenuId, setOpenTeamMenuId] = useState(null);
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Portal Preview
  const [previewPortalId, setPreviewPortalId] = useState(null);
  const [portalReportViewing, setPortalReportViewing] = useState(null);

  // AI Reports
  const [reportViewMode, setReportViewMode] = useState('generated');
  const [wizardState, setWizardState] = useState({ isOpen: false, step: 1, clientId: '', source: '', rawData: '', uploadFile: null, additionalInstructions: '' });
  const [editorState, setEditorState] = useState({ isOpen: false, report: null });
  const [isAutopilotModalOpen, setIsAutopilotModalOpen] = useState(false);
  const [newAutopilotRule, setNewAutopilotRule] = useState({ reportId: '', frequency: '1st of Month', time: '09:00 AM', additionalInstructions: '', include_last_file: true });

  // Menus
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [openProposalMenuId, setOpenProposalMenuId] = useState(null);
  const [openInvoiceMenuId, setOpenInvoiceMenuId] = useState(null);
  const [openPortalMenuId, setOpenPortalMenuId] = useState(null);
  const [revokingPortal, setRevokingPortal] = useState(null);
  const [editingTimeEntry, setEditingTimeEntry] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #1 — INVOICE LINE ITEMS STATE
  // ─────────────────────────────────────────────────────────────
  const emptyLineItem = () => ({ id: Date.now(), description: '', quantity: 1, unitPrice: 0 });
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    clientId: '', due: '', tax: 0, notes: '', recurring: 'none',
    lineItems: [emptyLineItem()]
  });

  const calcInvoiceSubtotal = (lineItems) =>
    lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0), 0);

  const calcInvoiceTotal = (lineItems, tax) => {
    const sub = calcInvoiceSubtotal(lineItems);
    return sub + sub * ((parseFloat(tax) || 0) / 100);
  };

  const handleAddLineItem = () => {
    setNewInvoice(prev => ({ ...prev, lineItems: [...prev.lineItems, emptyLineItem()] }));
  };

  const handleRemoveLineItem = (id) => {
    setNewInvoice(prev => ({ ...prev, lineItems: prev.lineItems.filter(li => li.id !== id) }));
  };

  const handleLineItemChange = (id, field, value) => {
    setNewInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(li => li.id === id ? { ...li, [field]: value } : li)
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #2 — PROPOSAL BODY FIELDS STATE
  // ─────────────────────────────────────────────────────────────
  const emptyProposal = { clientId: '', title: '', value: '', status: 'Draft', introduction: '', scopeOfWork: '', deliverables: [''], timeline: '', paymentTerms: '' };
  const [isAddProposalOpen, setIsAddProposalOpen] = useState(false);
  const [newProposal, setNewProposal] = useState(emptyProposal);
  const [editingProposal, setEditingProposal] = useState(null);

  const handleAddDeliverable = (setter) => {
    setter(prev => ({ ...prev, deliverables: [...(prev.deliverables || []), ''] }));
  };

  const handleDeliverableChange = (setter, index, value) => {
    setter(prev => {
      const updated = [...(prev.deliverables || [])];
      updated[index] = value;
      return { ...prev, deliverables: updated };
    });
  };

  const handleRemoveDeliverable = (setter, index) => {
    setter(prev => ({ ...prev, deliverables: prev.deliverables.filter((_, i) => i !== index) }));
  };

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #3 — TASK EDIT & DELETE STATE
  // ─────────────────────────────────────────────────────────────
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', status: 'To Do', dueDate: '', assignee: '' });
  const [editingTask, setEditingTask] = useState(null);        // { id, title, status, dueDate, assignee }
  const [deletingTask, setDeletingTask] = useState(null);      // task object pending confirmation
  const [openTaskMenuId, setOpenTaskMenuId] = useState(null);  // which task card menu is open

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    if (!editingTask?.title) return;
    setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, title: editingTask.title, status: editingTask.status, dueDate: editingTask.dueDate, assignee: editingTask.assignee } : t));
    setEditingTask(null);
    showNotification('Task updated successfully.');
    await supabase.from('tasks').update({ title: editingTask.title, status: editingTask.status, due_date: editingTask.dueDate, assignee: editingTask.assignee }).eq('id', editingTask.id);
  };

  const handleConfirmDeleteTask = async () => {
    if (!deletingTask) return;
    const taskId = deletingTask.id;
    setTasks(tasks.filter(t => t.id !== taskId));
    setDeletingTask(null);
    showNotification('Task deleted.');
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #4 — CLIENT DELETE CONFIRMATION STATE
  // ─────────────────────────────────────────────────────────────
  const [deletingClient, setDeletingClient] = useState(null); // client object pending confirmation
  const [deletingProject, setDeletingProject] = useState(null); // project object pending confirmation

  const handleConfirmDeleteClient = async () => {
    if (!deletingClient) return;
    const clientId = deletingClient.id;

    // 1. Find all project IDs mapped to this client to cull tasks
    const clientProjectIds = projects.filter(p => p.clientId === clientId).map(p => p.id);
    
    // 2. Cascade deletions globally (local state)
    setTasks(tasks.filter(t => !clientProjectIds.includes(t.projectId)));
    setProjects(projects.filter(p => p.clientId !== clientId));
    setInvoices(invoices.filter(i => i.clientId !== clientId));
    setProposals(proposals.filter(p => p.clientId !== clientId));
    setPortals(portals.filter(p => p.clientId !== clientId));
    setFiles(files.filter(f => f.clientId !== clientId));
    setReminders(reminders.filter(r => r.clientId !== clientId));
    setReports(reports.filter(r => r.clientId !== clientId));
    setAutopilotConfigs(autopilotConfigs.filter(c => c.clientId !== clientId));
    
    setClients(clients.filter(c => c.id !== clientId));
    setDeletingClient(null);
    setOpenActionMenuId(null);
    if (selectedClient?.id === clientId) setSelectedClient(null);
    showNotification(`${deletingClient.name} and all related data have been permanently deleted.`);
    // DB cascade handles related records via ON DELETE CASCADE
    await supabase.from('clients').delete().eq('id', clientId);
  };

  const handleConfirmDeleteProject = async () => {
    if (!deletingProject) return;
    const projectId = deletingProject.id;
    // Cascade to tasks
    setTasks(tasks.filter(t => t.projectId !== projectId));
    setProjects(projects.filter(p => p.id !== projectId));
    setDeletingProject(null);
    if (selectedProject?.id === projectId) setSelectedProject(null);
    showNotification(`Project "${deletingProject.name}" and all associated tasks deleted.`);
    // DB cascade handles tasks via ON DELETE CASCADE
    await supabase.from('projects').delete().eq('id', projectId);
  };

  const handleDeleteInvoice = async (id) => {
    setInvoices(invoices.filter(inv => inv.id !== id));
    setSelectedInvoiceIds(prev => prev.filter(sid => sid !== id));
    setOpenInvoiceMenuId(null);
    showNotification(`Invoice ${id} deleted.`);
    await supabase.from('invoices').delete().eq('id', id);
  };

  const handleDeleteFile = async (id) => {
    const fileToDelete = files.find(f => f.id === id);
    setFiles(files.filter(f => f.id !== id));
    showNotification('File deleted.');
    if (fileToDelete?.storagePath) {
      await supabase.storage.from('client-files').remove([fileToDelete.storagePath]);
    }
    await supabase.from('client_files').delete().eq('id', id);
  };

  // Proposal & Project States
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({ clientId: '', name: '', budget: '', deadline: '', status: 'Not Started', progress: 0 });
  const [hiddenDashboardTasks, setHiddenDashboardTasks] = useState([]);

  // Timer & Time Entries
  const [timer, setTimer] = useState({ isRunning: false, seconds: 0, task: '', projectId: '' });
  const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
  const [manualTime, setManualTime] = useState({ task: '', projectId: '', hours: '', minutes: '', date: '' });
  const [openTimeMenuId, setOpenTimeMenuId] = useState(null);

  // --- DYNAMIC COMPUTED ENGINE ---
  const computedProjects = useMemo(() => {
    return projects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id);
      if (pTasks.length === 0) return p;
      const doneCount = pTasks.filter(t => t.status === 'Done').length;
      const reviewCount = pTasks.filter(t => t.status === 'In Review').length;
      const inProgressCount = pTasks.filter(t => t.status === 'In Progress').length;
      const todoCount = pTasks.filter(t => t.status === 'To Do').length;
      const totalScore = (inProgressCount * 0.5) + (reviewCount * 0.8) + (doneCount * 1.0);
      const progress = Math.round((totalScore / pTasks.length) * 100);
      let status = 'In Progress';
      if (progress === 100) status = 'Completed';
      else if (todoCount === pTasks.length) status = 'Not Started';
      else if (doneCount + reviewCount === pTasks.length && reviewCount > 0) status = 'In Review';
      return { ...p, progress, status };
    });
  }, [projects, tasks]);

  // --- DERIVED STATE ---
  const computedClients = useMemo(() => {
    return clients.map(client => {
      const clientInvoices = invoices.filter(i => i.clientId === client.id && i.status === 'Paid');
      const totalBilled = clientInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      const clientProjects = projects.filter(p => p.clientId === client.id);
      
      return {
        ...client,
        billed: totalBilled,
        projects: clientProjects.length
      };
    });
  }, [clients, invoices, projects]);

  const filteredClients = useMemo(() => computedClients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchQuery.toLowerCase())
  ), [computedClients, searchQuery]);

  const filteredProjects = useMemo(() =>
    computedProjects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [computedProjects, searchQuery]);

  const filteredAndSortedProjects = useMemo(() => {
    let result = filteredProjects;
    if (projectFilterStatus !== 'All') {
      result = result.filter(p => p.status === projectFilterStatus);
    }
    return result.slice().sort((a, b) => {
      if (projectSortBy === 'Newest First') return b.id - a.id;
      if (projectSortBy === 'Oldest First') return a.id - b.id;
      if (projectSortBy === 'Budget High to Low') return b.budget - a.budget;
      if (projectSortBy === 'Budget Low to High') return a.budget - b.budget;
      if (projectSortBy === 'Deadline Soonest') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return 0;
    });
  }, [filteredProjects, projectFilterStatus, projectSortBy]);

  const filteredInvoices = useMemo(() =>
    invoices.filter(i => i.id.toLowerCase().includes(searchQuery.toLowerCase())),
    [invoices, searchQuery]);

  const invoiceMetrics = useMemo(() => {
    const overdue = invoices.filter(i => i.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);
    const pending = invoices.filter(i => i.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0);
    const collected = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
    return { overdue, pending, collected };
  }, [invoices]);

  const metrics = useMemo(() => {
    const totalRev = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
    const activeClients = clients.filter(c => c.status === 'Active').length;
    const pendingInv = invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);
    const avgProject = computedProjects.length > 0 ? computedProjects.reduce((sum, p) => sum + p.budget, 0) / computedProjects.length : 0;
    return { totalRev, activeClients, pendingInv, avgProject };
  }, [clients, computedProjects, invoices]);

  const timeMetrics = useMemo(() => {
    const unbilledMins = timeEntries.filter(t => t.status === 'Unbilled').reduce((sum, t) => sum + t.duration, 0);
    const totalMins = timeEntries.reduce((sum, t) => sum + t.duration, 0);
    return {
      unbilledHours: (unbilledMins / 60).toFixed(1),
      totalHours: (totalMins / 60).toFixed(1),
      unbilledValue: Math.round((unbilledMins / 60) * 75)
    };
  }, [timeEntries]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery) return [];
    const q = globalSearchQuery.toLowerCase();
    const results = [];
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
        results.push({ id: `client-${c.id}`, type: 'Client', title: c.name, desc: c.email, icon: Building2, action: () => { setSelectedClient(c); setActiveTab('clients'); setIsGlobalSearchOpen(false); } });
    });
    computedProjects.forEach(p => {
      if (p.name.toLowerCase().includes(q)) {
        const client = clients.find(c => c.id === p.clientId);
        results.push({ id: `proj-${p.id}`, type: 'Project', title: p.name, desc: client?.name, icon: FolderKanban, action: () => { setSelectedProject(p); setActiveTab('projects'); setIsGlobalSearchOpen(false); } });
      }
    });
    invoices.forEach(i => {
      if (i.id.toLowerCase().includes(q)) {
        const client = clients.find(c => c.id === i.clientId);
        results.push({ id: `inv-${i.id}`, type: 'Invoice', title: i.id, desc: `${client?.name} • $${i.amount.toLocaleString()}`, icon: Receipt, action: () => { setActiveTab('invoices'); setIsGlobalSearchOpen(false); } });
      }
    });
    proposals.forEach(p => {
      if (p.title.toLowerCase().includes(q)) {
        results.push({ id: `prop-${p.id}`, type: 'Proposal', title: p.title, desc: 'Proposal', icon: FileSignature, action: () => { setActiveTab('proposals'); setIsGlobalSearchOpen(false); } });
      }
    });
    timeEntries.forEach(t => {
      if (t.task.toLowerCase().includes(q)) {
        results.push({ id: `time-${t.id}`, type: 'Time Entry', title: t.task, desc: 'Time Entry', icon: Timer, action: () => { setActiveTab('time'); setIsGlobalSearchOpen(false); } });
      }
    });
    return results;
  }, [globalSearchQuery, clients, computedProjects, invoices, proposals, timeEntries]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsGlobalSearchOpen(true); }
      if (e.key === 'Escape') setIsGlobalSearchOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const markAllNotificationsRead = () => setNotificationsList(notificationsList.map(n => ({ ...n, read: true })));
  const unreadNotificationsCount = notificationsList.filter(n => !n.read).length;

  const handleAvatarUpload = async (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setProfile({ ...profile, avatar: objectUrl });

      const userId = session.user.id;
      const storagePath = `settings/${userId}/avatar_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-files').upload(storagePath, file);
      if (uploadError) { 
        console.error('Avatar upload error:', uploadError); 
        showNotification('Failed to upload avatar.');
        return; 
      }
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(storagePath);
      const updatedProfile = { ...profile, avatar: publicUrl };
      setProfile(updatedProfile);
      showNotification("Profile avatar updated.");
      await supabase.from('user_settings').upsert({ user_id: userId, profile: updatedProfile }, { onConflict: 'user_id' });
    }
  };

  const handleLogoUpload = async (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setBranding({ ...branding, logo: objectUrl });

      const userId = session.user.id;
      const storagePath = `settings/${userId}/logo_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-files').upload(storagePath, file);
      if (uploadError) { 
        console.error('Logo upload error:', uploadError); 
        showNotification('Failed to upload logo.');
        return; 
      }
      const { data: { publicUrl } } = supabase.storage.from('client-files').getPublicUrl(storagePath);
      const updatedBranding = { ...branding, logo: publicUrl };
      setBranding(updatedBranding);
      showNotification("Agency logo updated!");
      await supabase.from('user_settings').upsert({ user_id: userId, branding: updatedBranding }, { onConflict: 'user_id' });
    }
  };

  const handleSaveProfile = async () => {
    showNotification("Profile saved.");
    await supabase.from('user_settings').upsert({ user_id: session.user.id, profile }, { onConflict: 'user_id' });
  };

  const handleSaveBusiness = async () => {
    showNotification("Business details saved.");
    await supabase.from('user_settings').upsert({ user_id: session.user.id, business }, { onConflict: 'user_id' });
  };

  const handleSaveBranding = async () => {
    showNotification("Branding settings saved.");
    await supabase.from('user_settings').upsert({ user_id: session.user.id, branding }, { onConflict: 'user_id' });
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval = null;
    if (timer.isRunning) interval = setInterval(() => setTimer(prev => ({ ...prev, seconds: prev.seconds + 1 })), 1000);
    else clearInterval(interval);
    return () => clearInterval(interval);
  }, [timer.isRunning]);

  const toggleTimer = async () => {
    if (timer.isRunning) {
      const durationMins = Math.floor(timer.seconds / 60);
      const newEntry = { projectId: timer.projectId ? parseInt(timer.projectId) : null, task: timer.task || 'General Work', duration: durationMins > 0 ? durationMins : 1, date: new Date().toISOString().split('T')[0], status: 'Unbilled' };
      const { data } = await supabase.from('time_entries').insert({ user_id: session.user.id, project_id: newEntry.projectId, task: newEntry.task, duration: newEntry.duration, date: newEntry.date, status: newEntry.status }).select().single();
      if (data) setTimeEntries([{ id: data.id, ...newEntry }, ...timeEntries]);
      else setTimeEntries([{ id: Date.now(), ...newEntry }, ...timeEntries]);
      setTimer({ isRunning: false, seconds: 0, task: '', projectId: '' });
    } else {
      setTimer({ ...timer, isRunning: true });
    }
  };

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // --- AI REPORTS LOGIC ---
  const handleFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result.split(',')[1];
      setWizardState((prev) => ({
        ...prev,
        uploadFile: {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          data: base64String,
          originalFile: file
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateReport = async () => {
    setWizardState({ ...wizardState, step: 3 });
    
    try {
                       setWizardState({ ...wizardState, step: 3 });

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const userToken = currentSession?.access_token || supabaseAnonKey;
        const functionUrl = `${supabaseUrl}/functions/v1/autopilot-report-generator`;

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({ 
            manualGeneration: true,
            isAutopilot: false,
            clientId: parseInt(wizardState.clientId), 
            source: wizardState.source, 
            rawData: wizardState.rawData,
            userId: session.user.id,
            uploadFile: wizardState.uploadFile ? { mimeType: wizardState.uploadFile.type, data: wizardState.uploadFile.data } : null,
            additionalInstructions: wizardState.additionalInstructions
          })
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || errorBody.message || `HTTP ${response.status}`);
        }
        
        const functionData = await response.json();


       const aiContent = functionData.content || "Unable to generate summary.";

       const reportData = { 
         user_id: session.user.id, 
         client_id: parseInt(wizardState.clientId), 
         month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), 
         status: 'Draft', 
         ai_summary: 'AI Analysis Complete.', 
         content: aiContent, 
         raw_data: wizardState.uploadFile ? `File attached: ${wizardState.uploadFile.name}\n${wizardState.additionalInstructions}` : (wizardState.rawData || 'No raw data provided.') 
       };
       
       const { data } = await supabase.from('reports').insert(reportData).select().single();
       const generatedReport = data ? { id: data.id, clientId: data.client_id, month: data.month, status: data.status, aiSummary: data.ai_summary, content: data.content, rawData: data.raw_data } : { id: Date.now(), clientId: parseInt(wizardState.clientId), month: reportData.month, status: 'Draft', aiSummary: reportData.ai_summary, content: reportData.content, rawData: reportData.raw_data };
       
       setReports([generatedReport, ...reports]);
       setWizardState({ isOpen: false, step: 1, clientId: '', source: '', rawData: '', uploadFile: null, additionalInstructions: '' });
       setEditorState({ isOpen: true, report: generatedReport });
       showNotification("AI Report Generated!");

    } catch (error) {
       console.error("AI Generation Error:", error);
        const errorMsg = error.message || "Unknown error occurred";
        showNotification(`AI Error: ${errorMsg}`);
       setWizardState({ ...wizardState, step: 1 });
    }
  };

  const handlePublishReport = async () => {
    setReports(reports.map(r => r.id === editorState.report.id ? { ...editorState.report, status: 'Published' } : r));
    setEditorState({ isOpen: false, report: null });
    await supabase.from('reports').update({ status: 'Published', content: editorState.report.content, ai_summary: editorState.report.aiSummary }).eq('id', editorState.report.id);
    showNotification('Report published to client portal!');
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    await supabase.from('reports').delete().eq('id', reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
    showNotification('Report deleted.');
  };

  const toggleAutopilot = async (clientId) => {
    const exists = autopilotConfigs.find(c => c.clientId === clientId);
    if (exists) {
      setAutopilotConfigs(prev => prev.map(c => c.clientId === clientId ? { ...c, enabled: !c.enabled } : c));
      await supabase.from('autopilot_configs').update({ enabled: !exists.enabled }).eq('id', exists.id);
    } else {
      const { data } = await supabase.from('autopilot_configs').insert({ user_id: session.user.id, client_id: clientId, enabled: true, cadence: '1st of Month' }).select().single();
      setAutopilotConfigs(prev => [...prev, { id: data?.id || Date.now(), clientId, enabled: true, cadence: '1st of Month' }]);
    }
  };

  const updateAutopilotCadence = async (clientId, cadence) => {
    setAutopilotConfigs(prev => prev.map(c => c.clientId === clientId ? { ...c, cadence } : c));
    const config = autopilotConfigs.find(c => c.clientId === clientId);
    if (config) await supabase.from('autopilot_configs').update({ cadence }).eq('id', config.id);
  };

  const updateAutopilotSettings = async (clientId, updates) => {
    const config = autopilotConfigs.find(c => c.clientId === clientId);
    setAutopilotConfigs(prev => prev.map(c => c.clientId === clientId ? { ...c, ...updates } : c));
    if (config) {
      await supabase.from('autopilot_configs').update(updates).eq('id', config.id);
    }
  };

  const handleCreateAutopilotRule = async () => {
    if (!newAutopilotRule.reportId) return;
    const reportObj = reports.find(r => r.id === parseInt(newAutopilotRule.reportId));
    if (!reportObj) return;
    const clientId = reportObj.clientId;
    const combinedCadence = `${newAutopilotRule.frequency} at ${newAutopilotRule.time}`;
    const nextRunAt = calculateNextRunTimestamp(newAutopilotRule.frequency, newAutopilotRule.time);
    
    const exists = autopilotConfigs.find(c => c.clientId === clientId);
    const ruleData = { 
      enabled: true, 
      cadence: combinedCadence, 
      next_run_at: nextRunAt,
      report_id: parseInt(newAutopilotRule.reportId)
    };
    if (exists) {
      setAutopilotConfigs(prev => prev.map(c => c.clientId === clientId ? { ...c, ...ruleData } : c));
      await supabase.from('autopilot_configs').update(ruleData).eq('id', exists.id);
    } else {
      const newRule = { user_id: session.user.id, client_id: clientId, ...ruleData };
      const { data } = await supabase.from('autopilot_configs').insert(newRule).select().single();
      if (data) setAutopilotConfigs(prev => [...prev, { id: data.id, clientId, ...ruleData }]);
    }
    
    setIsAutopilotModalOpen(false);
    setNewAutopilotRule({ reportId: '', frequency: '1st of Month', time: '09:00 AM', additionalInstructions: '', include_last_file: true });
    showNotification('Autopilot delivery rule saved!');
  };

  const handleTestAutopilot = async (clientId) => {
    const config = autopilotConfigs.find(c => c.clientId === clientId);
    if (!config) return;

    showNotification(`Triggering test run for client...`);

    try {
      const { data: functionData, error: functionError } = await supabase.functions.invoke('autopilot-report-generator', {
        body: { forceRunClientId: clientId }
      });
      if (functionError) throw functionError;

      showNotification("Report sent to your email for review! Check your inbox.");
      fetchData();
    } catch (e) {
      console.error(e);
      showNotification("Failed to send — check the Supabase function logs.");
    }
  };

  const calculateNextRunTimestamp = (frequency, timeString) => {
    const now = new Date();
    // Parse timeString (e.g., "09:00 AM")
    const parts = timeString.split(' ');
    const time = parts[0];
    const modifier = parts[1];
    
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    let targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    if (frequency === '1st of Month') {
      targetDate.setDate(1);
      if (targetDate <= now) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
    } else if (frequency === '15th of Month') {
      targetDate.setDate(15);
      if (targetDate <= now) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
    } else if (frequency === 'Every Monday') {
      const day = targetDate.getDay();
      const diff = (day <= 1 ? 1 - day : 8 - day);
      targetDate.setDate(targetDate.getDate() + diff);
      if (targetDate <= now) {
        targetDate.setDate(targetDate.getDate() + 7);
      }
    } else if (frequency === 'Last Friday') {
      const getLastFriday = (date) => {
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const day = lastDay.getDay();
        const diff = (day >= 5 ? day - 5 : day + 2);
        lastDay.setDate(lastDay.getDate() - diff);
        return lastDay;
      };
      targetDate = getLastFriday(now);
      targetDate.setHours(hours, minutes, 0, 0);
      if (targetDate <= now) {
        targetDate = getLastFriday(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        targetDate.setHours(hours, minutes, 0, 0);
      }
    }

    return targetDate.toISOString(); // UTC string
  };

  const calculateNextRun = (cadence) => {
    if (!cadence) return "Unknown";
    const now = new Date();
    const timeStr = cadence.split(' at ')[1] || '';
    if (cadence.includes('1st of Month')) return `Next 1st, ${timeStr}`;
    if (cadence.includes('15th of Month')) return `Next 15th, ${timeStr}`;
    if (cadence.includes('Last Friday')) return `Next Last Friday, ${timeStr}`;
    if (cadence.includes('Every Monday')) return `Next Monday, ${timeStr}`;
    return cadence;
  };

  // --- TIME HANDLERS ---
  const handleManualTimeSubmit = async (e) => {
    e.preventDefault();
    const totalMins = (parseInt(manualTime.hours) || 0) * 60 + (parseInt(manualTime.minutes) || 0);
    if (totalMins === 0) return;
    const newEntry = { projectId: manualTime.projectId ? parseInt(manualTime.projectId) : null, task: manualTime.task || 'General Work', duration: totalMins, date: manualTime.date || new Date().toISOString().split('T')[0], status: 'Unbilled' };
    const { data } = await supabase.from('time_entries').insert({ user_id: session.user.id, project_id: newEntry.projectId, task: newEntry.task, duration: newEntry.duration, date: newEntry.date, status: newEntry.status }).select().single();
    setTimeEntries([{ id: data?.id || Date.now(), ...newEntry }, ...timeEntries]);
    setIsManualTimeOpen(false);
    setManualTime({ task: '', projectId: '', hours: '', minutes: '', date: '' });
  };

  const handleEditTimeEntrySubmit = async (e) => {
    e.preventDefault();
    if (!editingTimeEntry) return;
    const totalMins = (parseInt(editingTimeEntry.hours) || 0) * 60 + (parseInt(editingTimeEntry.minutes) || 0);
    setTimeEntries(timeEntries.map(t => t.id === editingTimeEntry.id ? { ...t, task: editingTimeEntry.task, projectId: editingTimeEntry.projectId, duration: totalMins, date: editingTimeEntry.date } : t));
    setEditingTimeEntry(null);
    showNotification('Time entry updated successfully.');
    await supabase.from('time_entries').update({ task: editingTimeEntry.task, project_id: editingTimeEntry.projectId || null, duration: totalMins, date: editingTimeEntry.date }).eq('id', editingTimeEntry.id);
  };

  const handleToggleTimeStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Billed' ? 'Unbilled' : 'Billed';
    setTimeEntries(timeEntries.map(t => t.id === id ? { ...t, status: newStatus } : t));
    setOpenTimeMenuId(null);
    await supabase.from('time_entries').update({ status: newStatus }).eq('id', id);
  };

  const handleDeleteTimeEntry = async (id) => { setTimeEntries(timeEntries.filter(t => t.id !== id)); setOpenTimeMenuId(null); await supabase.from('time_entries').delete().eq('id', id); };

  // --- PORTAL ACTIONS ---
  const handleCopyLink = (url, portalId) => {
    const textArea = document.createElement("textarea");
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    try { document.execCommand('copy'); setCopyFeedbackId(portalId); setTimeout(() => setCopyFeedbackId(null), 2000); } catch (err) { console.error('Failed to copy', err); }
    document.body.removeChild(textArea);
  };

  const togglePortalPermission = async (portalId, permissionKey) => {
    const portal = portals.find(p => p.id === portalId);
    const updatedPerms = { ...portal.permissions, [permissionKey]: !portal.permissions[permissionKey] };
    setPortals(portals.map(p => p.id === portalId ? { ...p, permissions: updatedPerms } : p));
    await supabase.from('portals').update({ permissions: updatedPerms }).eq('id', portalId);
  };

  const handleTogglePortalStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    setPortals(portals.map(p => p.id === id ? { ...p, status: newStatus } : p));
    setOpenPortalMenuId(null);
    await supabase.from('portals').update({ status: newStatus }).eq('id', id);
  };

  const handleConfirmRevokePortal = async () => {
    if (!revokingPortal) return;
    const portalId = revokingPortal.id;
    setPortals(portals.filter(p => p.id !== portalId));
    setRevokingPortal(null);
    showNotification(`Portal access revoked.`);
    await supabase.from('portals').delete().eq('id', portalId);
  };

  const handleCreatePortal = async () => {
    if (!newPortalClient) return;
    const client = clients.find(c => c.id === parseInt(newPortalClient));
    if (!client) return;
    const secureHash = Math.random().toString(36).substring(2, 8);
    const cleanName = client.name.toLowerCase().replace(/\s+/g, '-');
    const portalData = { user_id: session.user.id, client_id: client.id, url: `https://www.clientdeck.pro/portal/${cleanName}-${secureHash}`, last_accessed: 'Never', status: 'Active', permissions: { invoices: true, projects: true, reports: true, files: true } };
    const { data } = await supabase.from('portals').insert(portalData).select().single();
    setPortals([...portals, { id: data?.id || Date.now(), clientId: client.id, url: portalData.url, lastAccessed: 'Never', status: 'Active', permissions: portalData.permissions }]);
    setIsPortalModalOpen(false);
    setNewPortalClient("");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const processFiles = async (uploadedFiles, clientId, uploader) => {
    const userId = session.user.id;
    for (const file of Array.from(uploadedFiles)) {
      const storagePath = `${userId}/${clientId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('client-files').upload(storagePath, file);
      if (uploadError) { console.error('Upload error:', uploadError); continue; }
      const { data } = await supabase.from('client_files').insert({ user_id: userId, client_id: clientId, name: file.name, size: formatFileSize(file.size), storage_path: storagePath, uploader, date: new Date().toISOString().split('T')[0] }).select().single();
      if (data) setFiles(prev => [{ id: data.id, clientId: data.client_id, name: data.name, size: data.size, storagePath: data.storage_path, uploader: data.uploader, date: data.date }, ...prev]);
    }
  };

  const handleFileChange = (e, clientId, uploader) => { if (e.target.files?.length) processFiles(e.target.files, clientId, uploader); };
  const handleDropFiles = (e, clientId, uploader) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files, clientId, uploader); };
  const handleFileDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleFileDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDownloadFile = async (e, file) => {
    e.stopPropagation(); e.preventDefault();
    if (file.storagePath) {
      const { data, error } = await supabase.storage.from('client-files').download(file.storagePath);
      if (error) { console.error('Download error:', error); showNotification('Download failed.'); return; }
      const url = URL.createObjectURL(data);
      const element = document.createElement('a');
      element.href = url;
      element.download = file.name;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(url);
    } else {
      const element = document.createElement('a');
      const fileBlob = new Blob([`Mock file content for: ${file.name}`], { type: 'text/plain' });
      element.href = URL.createObjectURL(fileBlob);
      element.download = file.name;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // --- SETTINGS HANDLERS ---
  const handleInviteMemberSubmit = async (e) => {
    e.preventDefault();
    if (!newMember.email) return;
    const namePrefix = newMember.email.split('@')[0];
    const { data } = await supabase.from('team_members').insert({ user_id: session.user.id, name: namePrefix, email: newMember.email, role: newMember.role, status: 'Invited' }).select().single();
    setTeamMembers([...teamMembers, { id: data?.id || Date.now(), name: namePrefix, email: newMember.email, role: newMember.role, status: 'Invited' }]);
    setIsInviteMemberOpen(false);
    setNewMember({ email: '', role: 'Editor' });
    showNotification(`Invitation sent to ${newMember.email}`);
  };

  const handleRemoveMember = async (id) => { setTeamMembers(teamMembers.filter(m => m.id !== id)); setOpenTeamMenuId(null); showNotification("Team member removed."); await supabase.from('team_members').delete().eq('id', id); };
  const handleChangeRole = async (id, newRole) => { setTeamMembers(teamMembers.map(m => m.id === id ? { ...m, role: newRole } : m)); setOpenTeamMenuId(null); showNotification(`Role updated to ${newRole}.`); await supabase.from('team_members').update({ role: newRole }).eq('id', id); };
  const toggleNotificationPref = async (key) => {
    const updated = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(updated);
    showNotification("Notification preferences updated.");
    await supabase.from('user_settings').upsert({ user_id: session.user.id, notification_prefs: updated }, { onConflict: 'user_id' });
  };
  const handleManageBilling = () => showNotification("Redirecting to Stripe Customer Portal...");
  const handlePasswordChange = () => showNotification("Password reset email sent.");

  const handleDeleteWorkspaceSubmit = () => {
    setIsDeleteWorkspaceModalOpen(false);
    setDeleteConfirmationText("");
    showNotification("Workspace deleted. Redirecting to login...");
  };

  // --- KANBAN LOGIC ---
  const handleDragStart = (e, taskId) => e.dataTransfer.setData('taskId', taskId);
  const handleDrop = async (e, newStatus) => { e.preventDefault(); const taskId = parseInt(e.dataTransfer.getData('taskId')); setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)); await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId); };
  const handleDragOver = (e) => e.preventDefault();

  // --- CLIENT LOGIC ---
  const handleAddClientSubmit = async (e) => {
    e.preventDefault();
    if (!newClient.name) return;
    const { data } = await supabase.from('clients').insert({ user_id: session.user.id, name: newClient.name, contact: newClient.contact, email: newClient.email, phone: newClient.phone, status: newClient.status, notes: newClient.notes }).select().single();
    if (data) setClients([...clients, { id: data.id, name: data.name, contact: data.contact, email: data.email, status: data.status, phone: data.phone, notes: data.notes, billed: 0, projects: 0 }]);
    setIsAddClientOpen(false);
    setNewClient({ name: '', contact: '', email: '', phone: '', status: 'Lead', notes: '' });
  };

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #2 — PROPOSAL SUBMIT HANDLERS (full fields)
  // ─────────────────────────────────────────────────────────────
  const handleAddProposalSubmit = async (e) => {
    e.preventDefault();
    if (!newProposal.title || !newProposal.clientId) return;
    const deliverables = newProposal.deliverables.filter(d => d.trim());
    const { data } = await supabase.from('proposals').insert({ user_id: session.user.id, client_id: parseInt(newProposal.clientId), title: newProposal.title, value: parseFloat(newProposal.value) || 0, status: newProposal.status, date: new Date().toISOString().split('T')[0], introduction: newProposal.introduction, deliverables, timeline: newProposal.timeline, payment_terms: newProposal.paymentTerms, scope_of_work: newProposal.scopeOfWork }).select().single();
    if (data) setProposals([{ id: data.id, clientId: data.client_id, title: data.title, value: parseFloat(data.value) || 0, status: data.status, date: data.date, introduction: data.introduction, deliverables: data.deliverables || [], timeline: data.timeline, paymentTerms: data.payment_terms, scopeOfWork: data.scope_of_work }, ...proposals]);
    setIsAddProposalOpen(false);
    setNewProposal(emptyProposal);
    showNotification('Proposal created successfully.');
  };

  const handleEditProposalSubmit = async (e) => {
    e.preventDefault();
    if (!editingProposal.title || !editingProposal.clientId) return;
    const deliverables = (editingProposal.deliverables || []).filter(d => d.trim());
    setProposals(proposals.map(p => p.id === editingProposal.id ? { ...editingProposal, clientId: parseInt(editingProposal.clientId), value: parseFloat(editingProposal.value) || 0, deliverables } : p));
    setEditingProposal(null);
    showNotification('Proposal updated.');
    await supabase.from('proposals').update({ client_id: parseInt(editingProposal.clientId), title: editingProposal.title, value: parseFloat(editingProposal.value) || 0, status: editingProposal.status, introduction: editingProposal.introduction, deliverables, timeline: editingProposal.timeline, payment_terms: editingProposal.paymentTerms, scope_of_work: editingProposal.scopeOfWork }).eq('id', editingProposal.id);
  };

  const handleAddProjectSubmit = async (e) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientId) return;
    const { data } = await supabase.from('projects').insert({ user_id: session.user.id, client_id: parseInt(newProject.clientId), name: newProject.name, budget: parseFloat(newProject.budget) || 0, deadline: newProject.deadline, status: newProject.status, progress: 0 }).select().single();
    if (data) setProjects([{ id: data.id, clientId: data.client_id, name: data.name, budget: parseFloat(data.budget) || 0, deadline: data.deadline, status: data.status, progress: data.progress }, ...projects]);
    setIsAddProjectOpen(false);
    setNewProject({ clientId: '', name: '', budget: '', deadline: '', status: 'Not Started', progress: 0 });
  };

  const handleUpdateProposalStatus = async (id, newStatus) => { setProposals(proposals.map(p => p.id === id ? { ...p, status: newStatus } : p)); setOpenProposalMenuId(null); await supabase.from('proposals').update({ status: newStatus }).eq('id', id); };
  const handleDeleteProposal = async (id) => { setProposals(proposals.filter(p => p.id !== id)); setOpenProposalMenuId(null); await supabase.from('proposals').delete().eq('id', id); };

  const handleConvertToProject = (proposal) => {
    setNewProject({ clientId: proposal.clientId, name: proposal.title, budget: proposal.value, deadline: '', status: 'Not Started', progress: 0 });
    setOpenProposalMenuId(null);
    setIsAddProjectOpen(true);
    setActiveTab('projects');
  };

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #3 — TASK ADD HANDLER (unchanged but included)
  // ─────────────────────────────────────────────────────────────
  const handleAddTaskSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title || !selectedProject) return;
    const { data } = await supabase.from('tasks').insert({ user_id: session.user.id, project_id: selectedProject.id, title: newTask.title, status: newTask.status, due_date: newTask.dueDate, assignee: newTask.assignee }).select().single();
    if (data) setTasks([...tasks, { id: data.id, projectId: data.project_id, title: data.title, status: data.status, dueDate: data.due_date, assignee: data.assignee }]);
    setIsAddTaskOpen(false);
    setNewTask({ title: '', status: 'To Do', dueDate: '', assignee: '' });
  };

  const handleCompleteTask = async (id) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: 'Done' } : t)); showNotification("Task marked as completed! 🚀"); await supabase.from('tasks').update({ status: 'Done' }).eq('id', id); };
  const handleHideDashboardTask = (id) => { setHiddenDashboardTasks([...hiddenDashboardTasks, id]); showNotification("Task hidden from agenda."); };

  // --- BULK INVOICE HANDLERS ---
  const handleSelectAllInvoices = () => {
    const isAllSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
    if (isAllSelected) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map(inv => inv.id));
    }
  };
  const handleToggleInvoice = (e, id) => {
    e.stopPropagation();
    setSelectedInvoiceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const handleMarkAllPaid = async () => {
    setInvoices(invoices.map(inv => selectedInvoiceIds.includes(inv.id) ? { ...inv, status: 'Paid' } : inv));
    showNotification(`${selectedInvoiceIds.length} invoices marked as Paid.`);
    for (const invId of selectedInvoiceIds) {
      await supabase.from('invoices').update({ status: 'Paid' }).eq('id', invId);
    }
    setSelectedInvoiceIds([]);
  };
  const handleSendRemindersBulk = () => {
    showNotification(`Payment reminders sent for ${selectedInvoiceIds.length} invoices.`);
    setSelectedInvoiceIds([]);
  };
  
  // --- END BULK INVOICE HANDLERS ---

  // ─────────────────────────────────────────────────────────────
  // HIGH PRIORITY FIX #1 — INVOICE CREATE HANDLER (line items)
  // ─────────────────────────────────────────────────────────────
  const handleCreateInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!newInvoice.clientId || newInvoice.lineItems.length === 0) return;
    const total = calcInvoiceTotal(newInvoice.lineItems, newInvoice.tax);
    if (total <= 0) return;
    const newIdNumber = invoices.length > 0 ? Math.max(...invoices.map(inv => parseInt(inv.id.replace('#INV-', '')) || 0)) + 1 : 42;
    const newId = `#INV-0${newIdNumber}`;
    const invoiceObj = { id: newId, clientId: parseInt(newInvoice.clientId), amount: parseFloat(total.toFixed(2)), status: 'Pending', date: new Date().toISOString().split('T')[0], due: newInvoice.due || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], lineItems: newInvoice.lineItems, tax: parseFloat(newInvoice.tax) || 0, notes: newInvoice.notes, recurring: newInvoice.recurring };
    await supabase.from('invoices').insert({ id: newId, user_id: session.user.id, client_id: invoiceObj.clientId, amount: invoiceObj.amount, status: invoiceObj.status, date: invoiceObj.date, due: invoiceObj.due, line_items: invoiceObj.lineItems, tax: invoiceObj.tax, notes: invoiceObj.notes, recurring: invoiceObj.recurring });
    setInvoices([invoiceObj, ...invoices]);
    setIsCreateInvoiceOpen(false);
    setNewInvoice({ clientId: '', due: '', tax: 0, notes: '', recurring: 'none', lineItems: [emptyLineItem()] });
    showNotification(`Invoice ${newId} created successfully.`);
    if (newInvoice.recurring && newInvoice.recurring !== 'none') {
      setTimeout(() => showNotification(`Recurring invoice scheduled — will auto-generate ${newInvoice.recurring.toLowerCase()}.`), 300);
    }
  };

  const handleCopyInvoiceLink = (id) => { handleCopyLink(`${branding.domain || 'clientdeck'}.pro/pay/${id.replace('#', '')}`, id); showNotification("Payment link copied!"); setOpenInvoiceMenuId(null); };
  const handleMarkInvoicePaid = async (id) => { setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: 'Paid' } : inv)); showNotification(`Invoice ${id} marked as Paid.`); setOpenInvoiceMenuId(null); await supabase.from('invoices').update({ status: 'Paid' }).eq('id', id); };
  const handleSendReminder = (id) => { showNotification(`Payment reminder sent for ${id}.`); setOpenInvoiceMenuId(null); };

  const handleDownloadInvoice = (e, invoice) => {
    e.stopPropagation(); e.preventDefault();
    const client = clients.find(c => c.id === invoice.clientId);
    const element = document.createElement("a");
    const fileBlob = new Blob([`INVOICE ${invoice.id}\nClient: ${client?.name}\nAmount: $${invoice.amount}\nDue: ${invoice.due}\nStatus: ${invoice.status}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(fileBlob);
    element.download = `${invoice.id.replace('#', '')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setOpenInvoiceMenuId(null);
  };

  const sidebarCounts = useMemo(() => {
    return {
      'invoices': invoices.filter(i => i.status === 'Overdue' || i.status === 'Pending').length,
      'proposals': proposals.filter(p => p.status === 'Sent').length,
      'projects': projects.filter(p => p.status === 'In Review').length,
    };
  }, [invoices, proposals, projects]);

  const navigation = [
    { name: 'Dashboard', id: 'dashboard', icon: LayoutDashboard },
    { name: 'Clients', id: 'clients', icon: Users },
    { name: 'Proposals', id: 'proposals', icon: FileSignature },
    { name: 'Projects', id: 'projects', icon: FolderKanban },
    { name: 'Time & Expenses', id: 'time', icon: Timer },
    { name: 'AI Reports', id: 'reports', icon: BarChart2 },
    { name: 'Client Portals', id: 'portals', icon: Globe },
    { name: 'Invoices', id: 'invoices', icon: Receipt },
    { name: 'Settings', id: 'settings', icon: Settings },
  ];

  // =============================================================
  // VIEWS
  // =============================================================

  const renderDashboardView = () => {
    const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
    const pendingProposals = proposals.filter(p => p.status === 'Sent');
    const activeTasks = tasks.filter(t => (t.status === 'To Do' || t.status === 'In Progress') && !hiddenDashboardTasks.includes(t.id)).slice(0, 5);
    const activityStream = [
      ...notificationsList.map(n => ({ ...n, type: 'notification' })),
      ...reminders.map(r => ({ id: `rem-${r.id}`, title: 'Reminder', desc: r.text, time: r.date, icon: BellRing, color: 'text-amber-500', bg: 'bg-amber-50', type: 'reminder' }))
    ];
    const cashFlowData = [40, 60, 45, 80, 55, Math.min(100, (metrics.totalRev / 20000) * 100)];

    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        {(overdueInvoices.length > 0 || pendingProposals.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0"><AlertCircle size={24} /></div>
              <div>
                <h3 className="text-amber-900 font-bold text-lg">Needs Attention</h3>
                <p className="text-amber-700 text-sm mt-0.5">You have {overdueInvoices.length} overdue invoice(s) totaling ${overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()} and {pendingProposals.length} proposal(s) awaiting signature.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto">
              {overdueInvoices.length > 0 && <button onClick={() => setActiveTab('invoices')} className="flex-1 md:flex-none px-4 py-2 bg-white text-amber-700 text-sm font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors">Resolve Invoices</button>}
              {pendingProposals.length > 0 && <button onClick={() => setActiveTab('proposals')} className="flex-1 md:flex-none px-4 py-2 bg-white text-amber-700 text-sm font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors">View Proposals</button>}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'New Invoice', icon: Receipt, color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white', border: 'hover:border-blue-300', action: () => setIsCreateInvoiceOpen(true) },
              { label: 'New Project', icon: FolderKanban, color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white', border: 'hover:border-indigo-300', action: () => setIsAddProjectOpen(true) },
              { label: 'Log Time', icon: Timer, color: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white', border: 'hover:border-emerald-300', action: () => setIsManualTimeOpen(true) },
              { label: 'Add Client', icon: Building2, color: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white', border: 'hover:border-purple-300', action: () => setIsAddClientOpen(true) },
            ].map(({ label, icon: Icon, color, border, action }) => (
              <button key={label} onClick={action} className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm ${border} hover:shadow-md transition-all group flex flex-col items-center text-center gap-3`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors scale-100 group-hover:scale-110 ${color}`}><Icon size={20} /></div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard title="Collected This Month" value={`$${metrics.totalRev.toLocaleString()}`} icon={DollarSign} color="bg-emerald-100 text-emerald-600" />
          <StatCard title="Outstanding Invoices" value={`$${metrics.pendingInv.toLocaleString()}`} icon={Clock} color="bg-amber-100 text-amber-600" />
          <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h4 className="text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">Cash Flow (Last 6 Mo)</h4>
                <div className="text-2xl font-extrabold text-white">${(metrics.totalRev + 85000).toLocaleString()}</div>
              </div>
              <BarChart2 className="text-blue-400" size={24} />
            </div>
            <div className="flex items-end gap-3 h-20 w-full relative z-10">
              {cashFlowData.map((height, i) => (
                <div key={i} className="flex-1 bg-white/10 rounded-t-md relative group flex flex-col justify-end h-full">
                  <div className={`w-full rounded-t-md transition-all duration-1000 ${i === 5 ? 'bg-blue-500' : 'bg-white/30 group-hover:bg-white/50'}`} style={{ height: `${height}%` }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 size={20} className="text-blue-500" /> Today's Execution Agenda</h3>
              <button onClick={() => setActiveTab('projects')} className="text-sm text-blue-600 font-medium hover:underline">View Projects</button>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {activeTasks.length > 0 ? activeTasks.map(task => {
                const project = computedProjects.find(p => p.id === task.projectId);
                return (
                  <div key={task.id} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group relative pr-12">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1.5"><FolderKanban size={12} /> {project?.name || 'General'}</p>
                    </div>
                    <StatusBadge status={task.status} />
                    <button onClick={() => handleHideDashboardTask(task.id)} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                  </div>
                );
              }) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-xl text-slate-500">You have no active tasks. Enjoy your day!</div>
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500 flex items-center gap-2"><Hourglass size={16} className="text-emerald-500" /> Time logged today: <strong className="text-slate-900">{timeMetrics.totalHours}h</strong></div>
              <button onClick={toggleTimer} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${timer.isRunning ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                {timer.isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                {timer.isRunning ? 'Stop Timer' : 'Start Timer'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full max-h-[500px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BellRing size={20} className="text-amber-500" /> Activity Stream</h3>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {activityStream.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={item.id || idx} className="flex items-start gap-3 relative">
                    {idx !== activityStream.length - 1 && <div className="absolute top-8 left-4 w-px h-full bg-slate-100 -z-10"></div>}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border-2 border-white ${item.bg} ${item.color}`}><Icon size={14} /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderClientsView = () => {
    if (selectedClient) {
      const clientProjects = computedProjects.filter(p => p.clientId === selectedClient.id);
      const clientInvoices = invoices.filter(i => i.clientId === selectedClient.id);
      const clientFiles = files.filter(f => f.clientId === selectedClient.id);
      return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 bg-white/95 backdrop-blur z-10">
            <button onClick={() => setSelectedClient(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200"><ArrowLeft size={20} /></button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedClient.name}</h2>
              <div className="text-sm text-slate-500 flex items-center gap-2 mt-1"><StatusBadge status={selectedClient.status} /><span>Client Profile</span></div>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Contact Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-slate-600"><Users size={16} className="text-slate-400" /> {selectedClient.contact || 'No contact'}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-600"><Mail size={16} className="text-slate-400" /> {selectedClient.email || 'No email'}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-600"><Phone size={16} className="text-slate-400" /> {selectedClient.phone || 'No phone'}</div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Private Notes</h3>
                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic border border-slate-100">{selectedClient.notes ? `"${selectedClient.notes}"` : "No notes available."}</div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-sm text-slate-500 mb-1">Total Billed</div><div className="text-2xl font-bold text-slate-900">${selectedClient.billed.toLocaleString()}</div></div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><div className="text-sm text-slate-500 mb-1">Active Projects</div><div className="text-2xl font-bold text-slate-900">{clientProjects.length}</div></div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Associated Projects</h3></div>
                {clientProjects.length > 0 ? (
                  <div className="space-y-3">{clientProjects.map(p => (
                    <div key={p.id} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center shadow-sm hover:border-blue-300 transition-colors cursor-pointer" onClick={() => { setSelectedProject(p); setActiveTab('projects'); }}>
                      <div><div className="font-bold text-slate-900 text-sm">{p.name}</div><div className="text-xs text-slate-500 mt-0.5">Deadline: {p.deadline}</div></div>
                      <StatusBadge status={p.status} />
                    </div>
                  ))}</div>
                ) : <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100">No active projects.</p>}
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Shared Files</h3>
                  <div className="relative overflow-hidden cursor-pointer group">
                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileChange(e, selectedClient.id, 'Agency')} />
                    <button className="text-blue-600 text-sm font-medium group-hover:underline flex items-center gap-1"><UploadCloud size={14} /> Upload File</button>
                  </div>
                </div>
                {clientFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{clientFiles.map(file => (
                    <div key={file.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow group">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><FileText size={20} /></div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate">{file.name}</p><p className="text-xs text-slate-500 mt-0.5">{file.size} • {file.uploader}</p></div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => handleDownloadFile(e, file)} className="text-slate-400 hover:text-blue-600 p-2" title="Download"><Download size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }} className="text-slate-400 hover:text-red-600 p-2" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}</div>
                ) : <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100">No files shared yet.</p>}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Recent Invoices</h3>
                {clientInvoices.length > 0 ? (
                  <div className="space-y-3">{clientInvoices.map(inv => (
                    <div key={inv.id} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                      <div><div className="font-bold text-slate-900 text-sm">{inv.id}</div><div className="text-xs text-slate-500 mt-0.5">Due: {inv.due}</div></div>
                      <div className="flex items-center gap-4"><span className="text-sm font-bold text-slate-900">${inv.amount.toLocaleString()}</span><StatusBadge status={inv.status} /></div>
                    </div>
                  ))}</div>
                ) : <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100">No invoices linked.</p>}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Client Directory</h2>
          <button onClick={() => setIsAddClientOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><Plus size={16} /> Add Client</button>
        </div>
        {filteredClients.length > 0 ? (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium">Company</th><th className="p-4 font-medium">Primary Contact</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium">Total Value</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
              <tbody className="text-sm">
                {filteredClients.map(client => (
                  <tr key={client.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group" onClick={() => setSelectedClient(client)}>
                    <td className="p-4 font-medium text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">{client.name.charAt(0)}</div>
                      <span className="group-hover:text-blue-600 transition-colors">{client.name}</span>
                    </td>
                    <td className="p-4 text-slate-600">{client.contact || '-'}</td>
                    <td className="p-4"><StatusBadge status={client.status} /></td>
                    <td className="p-4 font-medium">${client.billed.toLocaleString()}</td>
                    <td className="p-4 text-right relative">
                      <button onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(openActionMenuId === client.id ? null : client.id); }} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-white transition-colors"><MoreVertical size={16} /></button>
                      {openActionMenuId === client.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(null); }}></div>
                          <div className="absolute right-8 top-10 w-36 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 z-20 py-2 overflow-hidden" onClick={e => e.stopPropagation()}>
                            <a href={`mailto:${client.email}`} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Mail size={14} className="text-slate-400" /> Email Client</a>
                            {/* ── FIX #4: triggers confirmation modal instead of instant delete ── */}
                            <button onClick={(e) => { e.stopPropagation(); setDeletingClient(client); setOpenActionMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} className="text-red-400" /> Delete</button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[400px] max-w-sm mx-auto space-y-4 py-12 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-2">
              <Search size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No clients found</h3>
            <p className="text-sm text-slate-500">We couldn't find any clients matching your search criteria. Add one to get started.</p>
            <button onClick={() => setIsAddClientOpen(true)} className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              Add Client
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderProjectsView = () => {
    if (selectedProject) {
      const currentProject = computedProjects.find(p => p.id === selectedProject.id) || selectedProject;
      const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <button onClick={() => setSelectedProject(null)} className="p-2 bg-slate-50 rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100"><ArrowLeft size={20} /></button>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{currentProject.name}</h2>
              <div className="flex items-center gap-4 mt-2">
                <StatusBadge status={currentProject.status} />
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${currentProject.progress}%` }}></div></div>
                  <span className="text-xs text-slate-500 font-bold w-12">{currentProject.progress}%</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsAddTaskOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2"><Plus size={16} /> Add Task</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 lg:gap-6">
            {['To Do', 'In Progress', 'In Review', 'Done'].map(status => (
              <div key={status} onDrop={(e) => handleDrop(e, status)} onDragOver={handleDragOver} className="bg-slate-100/60 border border-slate-200/60 rounded-2xl p-4 min-h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700 uppercase text-xs tracking-wider">
                    {status} <span className="bg-white border border-slate-200 text-slate-600 py-0.5 px-2 rounded-full ml-1 shadow-sm">{projectTasks.filter(t => t.status === status).length}</span>
                  </h3>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {projectTasks.filter(t => t.status === status).map(task => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-move hover:border-blue-400 hover:shadow-md transition-all group flex items-start gap-2">
                      <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900">{task.title}</p>
                        {(task.dueDate || task.assignee) && (
                          <div className="flex items-center gap-3 mt-2">
                            {task.dueDate && <span className="flex items-center gap-1 text-xs text-slate-500 font-medium"><Calendar size={12} className="text-blue-400" /> {task.dueDate}</span>}
                            {task.assignee && (
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0 ml-auto" title={task.assignee}>
                                {task.assignee.charAt(0)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* ── FIX #3: Task action menu with Edit & Delete ── */}
                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenTaskMenuId(openTaskMenuId === task.id ? null : task.id); }}
                          className="p-1 text-slate-300 hover:text-slate-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openTaskMenuId === task.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenTaskMenuId(null)}></div>
                            <div className="absolute right-0 top-6 w-36 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-100 z-20 py-2 overflow-hidden">
                              <button
                                onClick={() => { setEditingTask({ ...task }); setOpenTaskMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Edit2 size={13} className="text-blue-500" /> Edit Task
                              </button>
                              <button
                                onClick={() => { setDeletingTask(task); setOpenTaskMenuId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={13} className="text-red-400" /> Delete Task
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Active Projects</h2>
          <button onClick={() => setIsAddProjectOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><Plus size={16} /> New Project</button>
        </div>
        {/* FIX #1: Filter & Sort Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
          <select value={projectFilterStatus} onChange={e => setProjectFilterStatus(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="All">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Completed">Completed</option>
          </select>
          <select value={projectSortBy} onChange={e => setProjectSortBy(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="Newest First">Newest First</option>
            <option value="Oldest First">Oldest First</option>
            <option value="Budget High to Low">Budget High to Low</option>
            <option value="Budget Low to High">Budget Low to High</option>
            <option value="Deadline Soonest">Deadline Soonest</option>
          </select>
          {(projectFilterStatus !== 'All' || projectSortBy !== 'Newest First') && (
            <button onClick={() => { setProjectFilterStatus('All'); setProjectSortBy('Newest First'); }} className="text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium">Project Name</th><th className="p-4 font-medium">Client</th><th className="p-4 font-medium">Budget</th><th className="p-4 font-medium">Deadline</th><th className="p-4 font-medium">Progress</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
            <tbody className="text-sm">
              {filteredAndSortedProjects.map(project => {
                const client = clients.find(c => c.id === project.clientId);
                return (
                  <tr key={project.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group" onClick={() => setSelectedProject(project)}>
                    <td className="p-4 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</td>
                    <td className="p-4 text-slate-600">{client?.name}</td>
                    <td className="p-4 font-medium">${project.budget.toLocaleString()}</td>
                    <td className="p-4 text-slate-500">{project.deadline}</td>
                    <td className="p-4"><div className="w-full bg-slate-200 rounded-full h-2 max-w-[100px]"><div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }}></div></div></td>
                    <td className="p-4"><StatusBadge status={project.status} /></td>
                    <td className="p-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setDeletingProject(project); }} className="p-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all" title="Delete Project"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInvoicesView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatCard title="Total Overdue" value={`$${invoiceMetrics.overdue.toLocaleString()}`} icon={AlertCircle} color="bg-red-100 text-red-600" />
        <StatCard title="Pending Collection" value={`$${invoiceMetrics.pending.toLocaleString()}`} icon={Clock} color="bg-amber-100 text-amber-600" />
        <StatCard title="Collected This Month" value={`$${invoiceMetrics.collected.toLocaleString()}`} icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" />
      </div>
      {selectedInvoiceIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-blue-800 font-medium text-sm">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-900 text-xs font-bold">{selectedInvoiceIds.length}</span>
            invoices selected
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleMarkAllPaid} className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Mark All as Paid</button>
            <button onClick={handleSendRemindersBulk} className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">Send Reminder to All</button>
            <button onClick={() => setSelectedInvoiceIds([])} className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-100 transition-colors ml-2"><X size={18} /></button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
          <button onClick={() => setIsCreateInvoiceOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><Plus size={16} /> Create Invoice</button>
        </div>
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium w-12"><input type="checkbox" className="accent-blue-600 cursor-pointer w-4 h-4" checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id))} onChange={handleSelectAllInvoices} /></th><th className="p-4 font-medium">Invoice ID</th><th className="p-4 font-medium">Client</th><th className="p-4 font-medium">Amount</th><th className="p-4 font-medium">Date Issued</th><th className="p-4 font-medium">Due Date</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
            <tbody className="text-sm">
              {filteredInvoices.map(invoice => {
                const client = clients.find(c => c.id === invoice.clientId);
                return (
                  <tr key={invoice.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-4" onClick={(e) => handleToggleInvoice(e, invoice.id)}>
                      <input type="checkbox" className="accent-blue-600 cursor-pointer w-4 h-4" checked={selectedInvoiceIds.includes(invoice.id)} onChange={(e) => handleToggleInvoice(e, invoice.id)} />
                    </td>
                    <td className="p-4 font-medium text-slate-900">{invoice.id}</td>
                    <td className="p-4 text-slate-600">{client?.name}</td>
                    <td className="p-4 font-medium">${invoice.amount.toLocaleString()}</td>
                    <td className="p-4 text-slate-500">{invoice.date}</td>
                    <td className="p-4 text-slate-500">{invoice.due}</td>
                    <td className="p-4"><StatusBadge status={invoice.status} /></td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status !== 'Paid' && (
                          <>
                            <button onClick={() => handleSendReminder(invoice.id)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg" title="Send Reminder"><Mail size={16} /></button>
                            <button onClick={() => handleMarkInvoicePaid(invoice.id)} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg" title="Mark as Paid"><CheckCircle2 size={16} /></button>
                          </>
                        )}
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setOpenInvoiceMenuId(openInvoiceMenuId === invoice.id ? null : invoice.id); }} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-slate-50"><MoreVertical size={16} /></button>
                          {openInvoiceMenuId === invoice.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenInvoiceMenuId(null); }}></div>
                              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 z-20 py-2 text-left" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleCopyInvoiceLink(invoice.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Link size={14} className="text-slate-400" /> Copy Payment Link</button>
                                <button onClick={(e) => handleDownloadInvoice(e, invoice)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Download size={14} className="text-slate-400" /> Download PDF</button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button onClick={() => handleDeleteInvoice(invoice.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} className="text-red-400" /> Delete Invoice</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProposalsView = () => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900">Proposals & Contracts</h2>
        <button onClick={() => setIsAddProposalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><Plus size={16} /> New Proposal</button>
      </div>
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium">Proposal Title</th><th className="p-4 font-medium">Client</th><th className="p-4 font-medium">Value</th><th className="p-4 font-medium">Date Sent</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
          <tbody className="text-sm">
            {proposals.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center min-h-[400px]">
                  <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-4 py-12">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mb-2">
                      <FileSignature size={48} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">No proposals yet</h3>
                    <p className="text-sm text-slate-500">Create your first proposal to start winning clients.</p>
                    <button onClick={() => setIsAddProposalOpen(true)} className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                      New Proposal
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              proposals.map(prop => {
                const client = clients.find(c => c.id === prop.clientId);
              return (
                <tr key={prop.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer group" onClick={() => setEditingProposal({ ...prop, deliverables: prop.deliverables || [''] })}>
                  <td className="p-4 font-medium text-slate-900 group-hover:text-blue-600">{prop.title}</td>
                  <td className="p-4 text-slate-600">{client?.name || 'Unknown'}</td>
                  <td className="p-4 font-medium">${prop.value.toLocaleString()}</td>
                  <td className="p-4 text-slate-500">{prop.date}</td>
                  <td className="p-4"><StatusBadge status={prop.status} /></td>
                  <td className="p-4 text-right relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenProposalMenuId(openProposalMenuId === prop.id ? null : prop.id); }} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-white"><MoreVertical size={16} /></button>
                    {openProposalMenuId === prop.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenProposalMenuId(null); }}></div>
                        <div className="absolute right-8 top-10 w-48 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 z-20 py-2" onClick={e => e.stopPropagation()}>
                          {prop.status === 'Draft' && <button onClick={() => handleUpdateProposalStatus(prop.id, 'Sent')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Send size={14} className="text-blue-500" /> Mark as Sent</button>}
                          {prop.status !== 'Accepted' && <button onClick={() => handleUpdateProposalStatus(prop.id, 'Accepted')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> Mark as Accepted</button>}
                          {prop.status === 'Accepted' && <button onClick={() => handleConvertToProject(prop)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><FolderKanban size={14} className="text-indigo-500" /> Convert to Project</button>}
                          <button onClick={() => handleDeleteProposal(prop.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} className="text-red-400" /> Delete</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTimeView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-900 hidden md:block">Time & Expenses</h2>
        <button onClick={() => setIsManualTimeOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><Plus size={16} /> Log Time Manually</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Unbilled Value" value={`$${timeMetrics.unbilledValue.toLocaleString()}`} icon={DollarSign} color="bg-amber-100 text-amber-600" />
        <StatCard title="Unbilled Hours" value={`${timeMetrics.unbilledHours}h`} icon={Clock} color="bg-blue-100 text-blue-600" />
        <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center shadow-lg relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
          {!timer.isRunning ? (
            <div className="space-y-3 relative z-10">
              <input type="text" placeholder="What are you working on?" value={timer.task} onChange={e => setTimer({ ...timer, task: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <select value={timer.projectId} onChange={e => setTimer({ ...timer, projectId: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white focus:outline-none">
                <option value="">Select Project (Optional)</option>
                {computedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={toggleTimer} className="w-full mt-2 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2"><Play size={16} fill="currentColor" /> Start Timer</button>
            </div>
          ) : (
            <div className="text-center relative z-10">
              <h4 className="text-slate-400 font-medium text-sm mb-1 truncate">{timer.task || 'General Work'}</h4>
              <div className="text-4xl font-mono font-bold tracking-wider mb-4">{formatTime(timer.seconds)}</div>
              <button onClick={toggleTimer} className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-full font-medium text-sm flex items-center justify-center gap-2 mx-auto shadow-lg text-white"><Square size={16} fill="currentColor" /> Stop & Save</button>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900">Recent Time Entries</h2></div>
        <table className="w-full text-left border-collapse">
          <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium">Task Description</th><th className="p-4 font-medium">Project</th><th className="p-4 font-medium">Date</th><th className="p-4 font-medium">Duration</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
          <tbody className="text-sm">
            {timeEntries.map(entry => {
              const project = computedProjects.find(p => p.id === entry.projectId);
              return (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{entry.task}</td>
                  <td className="p-4 text-slate-600">{project?.name || '-'}</td>
                  <td className="p-4 text-slate-500">{entry.date}</td>
                  <td className="p-4 font-mono">{Math.floor(entry.duration / 60)}h {entry.duration % 60}m</td>
                  <td className="p-4"><StatusBadge status={entry.status} /></td>
                  <td className="p-4 flex items-center justify-end gap-2 relative">
                    <button onClick={() => setOpenTimeMenuId(openTimeMenuId === entry.id ? null : entry.id)} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-white"><MoreVertical size={16} /></button>
                    {openTimeMenuId === entry.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenTimeMenuId(null)}></div>
                        <div className="absolute right-8 top-10 w-40 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 z-20 py-2">
                          <button onClick={() => { setEditingTimeEntry({ ...entry, hours: Math.floor(entry.duration / 60), minutes: entry.duration % 60 }); setOpenTimeMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            <Edit2 size={14} className="text-blue-500" /> Edit Entry
                          </button>
                          <button onClick={() => handleToggleTimeStatus(entry.id, entry.status)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                            {entry.status === 'Billed' ? <Clock size={14} className="text-amber-500" /> : <CheckCircle2 size={14} className="text-green-500" />} Mark as {entry.status === 'Billed' ? 'Unbilled' : 'Billed'}
                          </button>
                          <button onClick={() => handleDeleteTimeEntry(entry.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} className="text-red-400" /> Delete</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {timeEntries.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-500">No time entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderReportsView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2"><Sparkles size={20} className="text-blue-400" /><span className="text-blue-200 font-semibold tracking-wide text-sm uppercase">AI Report Builder</span></div>
            <h2 className="text-3xl font-bold mb-2">Automate Your Client Insights</h2>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">Upload raw metrics and let our AI draft beautiful, strategic reports. Publish them directly to your clients' secure portals.</p>
          </div>
          <button onClick={() => setWizardState({ ...wizardState, isOpen: true, step: 1 })} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 whitespace-nowrap"><Wand2 size={18} /> Generate New Report</button>
        </div>
        <div className="flex items-center gap-6 mt-8 border-b border-white/10 pb-1 relative z-10">
          <button onClick={() => setReportViewMode('generated')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${reportViewMode === 'generated' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Generated Reports</button>
          <button onClick={() => setIsAiConfigOpen(true)} className="pb-2 text-sm font-medium text-slate-400 hover:text-white transition-colors ml-auto flex items-center gap-1"><Settings size={14} /> AI Prompts</button>
        </div>
      </div>
      {reportViewMode === 'generated' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-bold text-slate-900">Recent Reports</h3></div>
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium">Client</th><th className="p-4 font-medium">Period</th><th className="p-4 font-medium">AI Insights Summary</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
            <tbody className="text-sm">
              {reports.map(report => {
                const client = clients.find(c => c.id === report.clientId);
                return (
                  <tr key={report.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{client?.name}</td>
                    <td className="p-4 text-slate-500">{report.month}</td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{report.aiSummary}</td>
                    <td className="p-4"><StatusBadge status={report.status} /></td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditorState({ isOpen: true, report })} className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <Eye size={14} /> Review & Edit
                        </button>
                        <button onClick={() => handleDeleteReport(report.id)} className="px-2.5 py-1.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );

  const renderPortalsView = () => {
    const permissionLabels = { invoices: 'Invoices & Payments', projects: 'Project Boards', reports: 'AI Reports', files: 'Shared Files & Assets' };
    return (
      <div className="space-y-6 animate-in fade-in">
        <div><h2 className="text-2xl font-bold text-slate-900 mb-1">Secure Client Portals</h2><p className="text-slate-500 text-sm">Manage magic links where clients can view invoices, files, and project status.</p></div>
        {portals.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px] max-w-2xl mx-auto space-y-4 py-12 text-center mb-6">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-2">
              <Globe size={48} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No portals created yet</h3>
            <p className="text-sm text-slate-500">Generate a secure magic link for your first client.</p>
            <button onClick={() => setIsPortalModalOpen(true)} className="mt-4 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              Create First Portal
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map(portal => {
            const client = clients.find(c => c.id === portal.clientId);
            return (
              <div key={portal.id} className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative ${portal.status === 'Inactive' ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg border border-blue-100">{client?.name.charAt(0)}</div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={portal.status} />
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setOpenPortalMenuId(openPortalMenuId === portal.id ? null : portal.id); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                      {openPortalMenuId === portal.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenPortalMenuId(null)}></div>
                          <div className="absolute right-0 top-8 w-44 bg-white rounded-xl shadow-lg border border-slate-100 z-20 py-2">
                            <button onClick={() => handleTogglePortalStatus(portal.id, portal.status)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              {portal.status === 'Active' ? <X size={14} className="text-amber-500" /> : <CheckCircle2 size={14} className="text-green-500" />} {portal.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                            </button>
                            <button onClick={() => { setRevokingPortal(portal); setOpenPortalMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <Trash2 size={14} className="text-red-400" /> Revoke Access
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">{client?.name}</h3>
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1.5"><Clock size={14} /> Last viewed {portal.lastAccessed}</p>
                <div className="bg-slate-50 rounded-lg p-3 mb-4 flex items-center justify-between border border-slate-100">
                  <div className="text-xs text-slate-500 truncate flex-1 font-mono">{portal.url}</div>
                  <button onClick={() => handleCopyLink(portal.url, portal.id)} className="text-slate-400 hover:text-blue-600 ml-2 p-1.5 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50">
                    {copyFeedbackId === portal.id ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
                <div className="space-y-3 mb-5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Access Permissions</h4>
                  {Object.entries(permissionLabels).map(([key, label]) => {
                    const isEnabled = portal.permissions[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-sm text-slate-700">
                        <span>{label}</span>
                        <div onClick={() => togglePortalPermission(portal.id, key)} className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${isEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setPreviewPortalId(portal.id)} disabled={portal.status === 'Inactive'} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"><Eye size={16} /> Enter Preview Mode</button>
              </div>
            );
          })}
          <div onClick={() => setIsPortalModalOpen(true)} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors min-h-[300px]">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mb-4"><Plus size={24} /></div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Generate New Link</h3>
            <p className="text-sm text-slate-500">Invite a new client to their dedicated workspace.</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsView = () => {
    const tabs = [
      { id: 'profile', label: 'Profile', icon: Users },
      { id: 'business', label: 'Business', icon: Building2 },
      { id: 'branding', label: 'Branding', icon: Palette },
      { id: 'integrations', label: 'Integrations', icon: Database },
      { id: 'team', label: 'Team', icon: UserPlus },
      { id: 'notifications', label: 'Notifications', icon: BellRing },
      { id: 'billing', label: 'Billing', icon: CreditCard },
      { id: 'security', label: 'Security', icon: Lock }
    ];

    return (
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 lg:gap-8 animate-in fade-in pb-12">
        <div className="w-full md:w-56 shrink-0 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0">
          <div className="flex md:flex-col gap-2 min-w-max md:min-w-0">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = settingsTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => setSettingsTab(tab.id)} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 md:w-full border-b-[3px] md:border-b-0 md:border-l-[3px] text-left ${isActive ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-sm' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 w-full min-w-0">
          {settingsTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl animate-in fade-in slide-in-from-right-2">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Profile Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                  {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover shadow-sm border-2 border-white" /> : <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-sm">{profile.name.charAt(0)}</div>}
                  <div className="relative overflow-hidden cursor-pointer group">
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleAvatarUpload} />
                    <button className="bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium group-hover:bg-slate-100">Change Avatar</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label><input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                </div>
                <div className="pt-2"><button onClick={handleSaveProfile} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">Save Profile</button></div>
              </div>
            </div>
          )}
          {settingsTab === 'business' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-2xl animate-in fade-in slide-in-from-right-2">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Business Details</h2>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label><input type="text" value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
                  <select value={business.currency} onChange={e => setBusiness({ ...business, currency: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="USD ($)">USD ($)</option>
                    <option value="EUR (€)">EUR (€)</option>
                    <option value="GBP (£)">GBP (£)</option>
                    <option value="JPY (¥)">JPY (¥)</option>
                    <option value="CAD ($)">CAD ($)</option>
                    <option value="AUD ($)">AUD ($)</option>
                    <option value="CHF (Fr)">CHF (Fr)</option>
                    <option value="CNY (¥)">CNY (¥)</option>
                    <option value="INR (₹)">INR (₹)</option>
                    <option value="BRL (R$) ">BRL (R$)</option>
                    <option value="SGD ($)">SGD ($)</option>
                    <option value="HKD ($)">HKD ($)</option>
                    <option value="NZD ($)">NZD ($)</option>
                    <option value="MXN ($)">MXN ($)</option>
                    <option value="ZAR (R)">ZAR (R)</option>
                  </select>
                </div>
                <div className="pt-2"><button onClick={handleSaveBusiness} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">Save Changes</button></div>
              </div>
            </div>
          )}

          {settingsTab === 'branding' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-2">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Palette className="text-blue-500" size={20} /> White-Label Branding</h2><p className="text-sm text-slate-500 mt-1">Customize how your client portals look.</p></div>
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shrink-0">Pro Feature</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Agency Logo</label>
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-300 transition-colors cursor-pointer group h-32 overflow-hidden">
              <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleLogoUpload} />
              {branding.logo ? <img src={branding.logo} alt="Logo" className="h-full object-contain p-2" /> : <><div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3"><ImageIcon size={20} /></div><span className="text-sm font-medium text-blue-600 group-hover:underline">Upload Logo</span></>}
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Primary Color</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {['#2563eb', '#16a34a', '#db2777', '#9333ea', '#ea580c', '#0f172a'].map(color => (
                <button key={color} onClick={() => setBranding({ ...branding, color })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${branding.color === color ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-200 scale-110' : 'border-transparent'}`} style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-slate-200 shadow-inner shrink-0" style={{ backgroundColor: branding.color }}></div>
              <input type="text" value={branding.color} onChange={e => setBranding({ ...branding, color: e.target.value })} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
            </div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Portal Domain</label>
            <div className="flex items-center text-sm">
              <span className="bg-slate-100 border border-slate-200 border-r-0 rounded-l-lg px-3 py-2 text-slate-500 select-none">https://</span>
              <input type="text" value={branding.domain} onChange={e => setBranding({ ...branding, domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} className="w-full p-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-0" placeholder="your-agency" />
              <span className="bg-slate-100 border border-slate-200 border-l-0 rounded-r-lg px-3 py-2 text-slate-500 select-none">.clientdeck.pro</span>
            </div>
            <button className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"><Globe size={14} /> Connect Custom Domain</button>
          </div>
          <div className="pt-2 md:col-span-3"><button onClick={handleSaveBranding} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">Save Branding</button></div>
        </div>
            </div>
          )}

          {settingsTab === 'integrations' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-2">
              <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Database className="text-indigo-500" size={20} /> Integrations Hub</h2><p className="text-sm text-slate-500 mt-1">Connect tools to automate reporting, payments, and notifications.</p></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'stripe', label: 'Stripe Payments', desc: 'Accept credit cards and ACH directly on invoices.', icon: CreditCard, active: 'indigo' },
            { key: 'slack', label: 'Slack Notifications', desc: 'Get pinged on portal views, signatures, and payments.', icon: MessageSquare, active: 'emerald' },
            { key: 'analytics', label: 'Google Analytics', desc: 'Pull website traffic data into your monthly reports.', icon: LineChart, active: 'amber' },
            { key: 'meta', label: 'Meta Ads Manager', desc: 'Sync ad spend and conversion metrics to portals.', icon: Megaphone, active: 'blue' },
          ].map(({ key, label, desc, icon: Icon, active }) => (
            <div key={key} className={`border rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 transition-all ${integrations[key] ? `border-${active}-200 bg-${active}-50/30` : 'border-slate-200 bg-white'}`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-600"><Icon size={24} /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-slate-900">{label}</h3>
                  <button onClick={() => setIntegrations({ ...integrations, [key]: !integrations[key] })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${integrations[key] ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow ${integrations[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-3">{desc}</p>
                {integrations[key] && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md">Connected</span>}
              </div>
            </div>
          ))}
          
          <div className="border border-slate-200 bg-blue-50/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 md:col-span-2">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600"><Sparkles size={24} /></div>
            <div className="flex-1 w-full">
               <h3 className="font-bold text-slate-900 mb-1">Platform AI Intelligence</h3>
               <p className="text-sm text-slate-500 mb-3">AI report generation is powered by the platform. As a <b>Pro</b> subscriber, you have unlimited access to AI analysis without needing your own API keys.</p>
               <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
                 <CheckCircle2 size={14} /> Service Active
               </div>
            </div>
          </div>
          
          <div className="pt-2 md:col-span-2">
            <button 
              onClick={async () => {
                showNotification("Integrations saved successfully.");
                await supabase.from('user_settings').upsert({ user_id: session.user.id, integrations }, { onConflict: 'user_id' });
              }} 
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
            >
              Save Integrations
            </button>
          </div>
        </div>
            </div>
          )}

          {settingsTab === 'team' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-2">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Users className="text-blue-500" size={20} /> Team Management</h2><p className="text-sm text-slate-500 mt-1">Invite team members or contractors.</p></div>
          <button onClick={() => setIsInviteMemberOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"><UserPlus size={16} /> Invite Member</button>
        </div>
        <div className="overflow-x-auto min-h-[250px]">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100"><th className="p-4 font-medium">Team Member</th><th className="p-4 font-medium">Role</th><th className="p-4 font-medium">Status</th><th className="p-4 font-medium text-right">Actions</th></tr></thead>
            <tbody className="text-sm">
              {teamMembers.map(member => (
                <tr key={member.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">{member.name.charAt(0).toUpperCase()}</div>
                    <div><div className="font-bold">{member.name}</div><div className="text-xs text-slate-500 font-normal">{member.email}</div></div>
                  </td>
                  <td className="p-4"><span className="flex items-center gap-1.5 text-slate-700"><Shield size={14} className={member.role === 'Owner' ? 'text-amber-500' : member.role === 'Editor' ? 'text-blue-500' : 'text-slate-400'} />{member.role}</span></td>
                  <td className="p-4"><span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${member.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{member.status}</span></td>
                  <td className="p-4 text-right relative">
                    {member.role !== 'Owner' && (
                      <button onClick={(e) => { e.stopPropagation(); setOpenTeamMenuId(openTeamMenuId === member.id ? null : member.id); }} className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-white"><MoreVertical size={16} /></button>
                    )}
                    {openTeamMenuId === member.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenTeamMenuId(null)}></div>
                        <div className="absolute right-8 top-10 w-40 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 z-20 py-2 overflow-hidden text-left" onClick={e => e.stopPropagation()}>
                          <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">Change Role</div>
                          <button onClick={() => handleChangeRole(member.id, 'Editor')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Editor</button>
                          <button onClick={() => handleChangeRole(member.id, 'Viewer')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Viewer</button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button onClick={() => handleRemoveMember(member.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} className="text-red-400" /> Remove User</button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
            </div>
          )}

          {settingsTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-3xl animate-in fade-in slide-in-from-right-2">
              <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BellRing className="text-amber-500" size={20} /> Notification Preferences</h2></div>
        <div className="p-0 divide-y divide-slate-100">
          {[
            { key: 'invoicePaid', title: 'Invoice Payments', desc: 'Get alerted when a client pays an invoice.' },
            { key: 'portalViewed', title: 'Portal Activity', desc: 'Know when a client opens their portal.' },
            { key: 'proposalSigned', title: 'Proposal Signatures', desc: 'Receive a notification when a proposal is approved.' },
            { key: 'dailyDigest', title: 'Daily Digest', desc: 'A morning summary of overdue tasks and pending invoices.' },
            { key: 'marketingEmails', title: 'Product Updates', desc: 'Occasional emails about new ClientDeck features.' }
          ].map((pref) => (
            <div key={pref.key} className="flex items-center justify-between p-6 hover:bg-slate-50">
              <div><h3 className="font-bold text-slate-900">{pref.title}</h3><p className="text-sm text-slate-500 mt-0.5">{pref.desc}</p></div>
              <button onClick={() => toggleNotificationPref(pref.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationPrefs[pref.key] ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow ${notificationPrefs[pref.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
            </div>
          )}

          {settingsTab === 'billing' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-2">
              <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CreditCard className="text-slate-500" size={20} /> Billing & Subscription</h2></div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide">Pro Plan</span>
            <div className="mt-4 flex items-end gap-1 mb-6"><span className="text-4xl font-extrabold text-slate-900">$29</span><span className="text-slate-500 font-medium mb-1">/ month</span></div>
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm font-medium"><span className="text-slate-600">Active Clients</span><span>{clients.filter(c => c.status === 'Active').length} / 50</span></div>
              <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(clients.filter(c => c.status === 'Active').length / 50) * 100}%` }}></div></div>
            </div>
            <button onClick={handleManageBilling} className="w-full py-2.5 bg-white border border-slate-300 shadow-sm text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 flex items-center justify-center gap-2">Manage Billing <ExternalLink size={16} className="text-slate-400" /></button>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider mb-4">Payment History</h3>
            <div className="space-y-3">
              {billingHistory.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
                    <div><div className="text-sm font-bold text-slate-900">{inv.date}</div><div className="text-xs text-slate-500 mt-0.5">{inv.id} • ${inv.amount.toFixed(2)}</div></div>
                  </div>
                  <button className="text-blue-600 text-sm font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-blue-100">Receipt</button>
                </div>
              ))}
            </div>
          </div>
        </div>
            </div>
          )}

          {settingsTab === 'security' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden max-w-3xl animate-in fade-in slide-in-from-right-2">
              <div className="p-6 border-b border-slate-100"><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Lock className="text-slate-500" size={20} /> Security & Account</h2></div>
        <div className="p-0 divide-y divide-slate-100">
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0"><Key size={20} /></div>
              <div><h3 className="font-bold text-slate-900">Change Password</h3><p className="text-sm text-slate-500 mt-0.5">We will email you a secure link to update your password.</p></div>
            </div>
            <button onClick={handlePasswordChange} className="px-5 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 shrink-0">Send Reset Link</button>
          </div>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${is2FAEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}><ShieldCheck size={20} /></div>
              <div><h3 className="font-bold text-slate-900">Two-Factor Authentication (2FA)</h3><p className="text-sm text-slate-500 mt-0.5">Require an authenticator code when logging in from a new device.</p></div>
            </div>
            <button onClick={() => { setIs2FAEnabled(!is2FAEnabled); showNotification(is2FAEnabled ? "2FA Disabled." : "2FA Enabled successfully."); }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${is2FAEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition shadow ${is2FAEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <div className="p-6 bg-red-50/50 border-t border-red-100">
          <h3 className="font-bold text-red-900 text-sm uppercase tracking-wider mb-2">Danger Zone</h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-sm text-red-700">Permanently delete your workspace and all data. This cannot be undone.</p>
              <button onClick={() => setIsDeleteWorkspaceModalOpen(true)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-sm flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"><AlertTriangle size={16} /> Delete Workspace</button>
            </div>
          </div>
        </div>
          )}
        </div>
      </div>
    );
  };

  // --- CLIENT PORTAL PREVIEW ---
  const renderPortalPreview = () => {
    const portal = portals.find(p => p.id === previewPortalId);
    if (!portal) return null;
    const client = clients.find(c => c.id === portal.clientId);
    const clientProjects = computedProjects.filter(p => p.clientId === client.id);
    const clientInvoices = invoices.filter(i => i.clientId === client.id);
    const clientProposals = proposals.filter(p => p.clientId === client.id);
    const clientReports = reports.filter(r => r.clientId === client.id && r.status === 'Published');
    const clientFiles = files.filter(f => f.clientId === client.id);
    const actionProposals = clientProposals.filter(p => p.status === 'Sent');
    const actionInvoices = clientInvoices.filter(i => i.status === 'Pending' || i.status === 'Overdue');
    const primaryBgStyle = { backgroundColor: branding.color };
    const primaryTextStyle = { color: branding.color };
    const primaryBorderStyle = { borderColor: branding.color };

    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-in fade-in">
        <div className="bg-amber-100 text-amber-800 p-2 text-center text-sm font-bold flex items-center justify-center gap-2 border-b border-amber-200 relative z-50"><Eye size={16} /> YOU ARE IN PREVIEW MODE — THIS IS EXACTLY WHAT {client.name.toUpperCase()} SEES.</div>
        <header className="bg-slate-900 text-white px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-3">
            {branding.logo ? <img src={branding.logo} alt="Logo" className="h-10 w-10 object-contain rounded bg-white p-1" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg" style={primaryBgStyle}>{business.name.charAt(0)}</div>}
            <span className="font-bold text-xl hidden sm:block">{business.name}</span>
          </div>
          <button onClick={() => setPreviewPortalId(null)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium border border-white/10"><ArrowLeft size={16} /> Exit to Admin</button>
        </header>
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-8 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-20" style={primaryBgStyle}></div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2 relative z-10">Welcome back, {client.contact.split(' ')[0]}!</h1>
            <p className="text-slate-500 relative z-10 text-base">Here is your dedicated workspace for {client.name}.</p>
          </div>
          {(actionProposals.length > 0 || actionInvoices.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><AlertCircle className="text-amber-500" size={24} /> Action Required</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actionProposals.map(prop => (
                  <div key={prop.id} className="bg-white p-6 rounded-2xl border-2 shadow-sm" style={{ borderColor: `${branding.color}40` }}>
                    <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center" style={primaryTextStyle}><FileSignature size={24} /></div><StatusBadge status="Pending Approval" /></div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{prop.title}</h3>
                    {prop.introduction && <p className="text-sm text-slate-600 mb-2">{prop.introduction}</p>}
                    {prop.scopeOfWork && <p className="text-sm text-slate-500 mb-2 italic">{prop.scopeOfWork}</p>}
                    {prop.deliverables?.length > 0 && (
                      <ul className="text-sm text-slate-600 mb-4 space-y-1">
                        {prop.deliverables.map((d, i) => <li key={i} className="flex items-center gap-2"><CheckCircle2 size={12} style={primaryTextStyle} /> {d}</li>)}
                      </ul>
                    )}
                    <p className="text-xs text-slate-400 mb-4">{prop.paymentTerms && `Payment: ${prop.paymentTerms}`}</p>
                    <button className="w-full py-2.5 text-white rounded-xl text-sm font-bold" style={primaryBgStyle}>Review & Sign Proposal</button>
                  </div>
                ))}
                {actionInvoices.map(inv => (
                  <div key={inv.id} className="bg-white p-6 rounded-2xl border-2 shadow-sm" style={{ borderColor: `${branding.color}40` }}>
                    <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center" style={primaryTextStyle}><Receipt size={24} /></div><StatusBadge status={inv.status} /></div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">Invoice {inv.id}</h3>
                    <p className="text-sm text-slate-500 mb-4">Due: {inv.due} • <span className="font-bold text-slate-900">${inv.amount.toLocaleString()}</span></p>
                    <button className="w-full py-2.5 text-white rounded-xl text-sm font-bold" style={primaryBgStyle}>Pay Now</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {portal.permissions.projects && clientProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FolderKanban size={24} style={primaryTextStyle} /> Project Tracker</h2>
              {clientProjects.map(project => (
                <div key={project.id} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex-1"><div className="flex items-center gap-4 mb-2"><h3 className="font-bold text-xl text-slate-900">{project.name}</h3><StatusBadge status={project.status} /></div><p className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={14} /> Target: {project.deadline}</p></div>
                  <div className="flex-1 w-full md:max-w-sm">
                    <div className="flex justify-between text-sm font-bold mb-3"><span className="text-slate-700">Progress</span><span style={primaryTextStyle}>{project.progress}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-4 shadow-inner"><div className="h-4 rounded-full transition-all duration-1000" style={{ width: `${project.progress}%`, ...primaryBgStyle }}></div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {portal.permissions.invoices && clientInvoices.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Receipt size={24} style={primaryTextStyle} /> Invoices & Payments</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Invoice</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Due</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {clientInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-900">#{inv.id}</td>
                        <td className="p-4 text-slate-500">{inv.date || '—'}</td>
                        <td className="p-4 text-slate-500">{inv.due || '—'}</td>
                        <td className="p-4 font-bold text-slate-900">${inv.amount.toLocaleString()}</td>
                        <td className="p-4"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{clientInvoices.length} invoice{clientInvoices.length !== 1 ? 's' : ''} total</span>
                  <span className="text-sm font-bold text-slate-900">Total Billed: ${clientInvoices.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          {portal.permissions.files && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Folder size={24} style={primaryTextStyle} /> Shared Files</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`p-8 border-b border-slate-100 flex flex-col items-center text-center cursor-pointer relative ${isDragging ? 'bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}`} onDragOver={handleFileDragOver} onDragLeave={handleFileDragLeave} onDrop={(e) => handleDropFiles(e, client.id, 'Client')}>
                  <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileChange(e, client.id, 'Client')} />
                  <div className="w-16 h-16 bg-white border-2 border-dashed rounded-full flex items-center justify-center mb-4 border-slate-300"><UploadCloud size={28} className="text-slate-400" /></div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">Click or drag files to upload</h3>
                  <p className="text-sm text-slate-500">Securely share files with your agency.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {clientFiles.length > 0 ? clientFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 hover:bg-slate-50 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0" style={primaryTextStyle}><FileText size={20} /></div>
                        <div><p className="text-sm font-bold text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{file.size} • by {file.uploader} on {file.date}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => handleDownloadFile(e, file)} className="text-slate-400 p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2"><Download size={14} /> <span className="hidden sm:block">Download</span></button>
                        <button onClick={() => handleDeleteFile(file.id)} className="text-red-400 hover:text-red-600 p-2 bg-white rounded-lg border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors" title="Delete file"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )) : <div className="p-8 text-center text-sm text-slate-500 italic">No files shared yet.</div>}
                </div>
              </div>
            </div>
          )}
          {portal.permissions.reports && clientReports.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles size={24} style={primaryTextStyle} /> Latest Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientReports.map(report => (
                  <div key={report.id} className="text-white p-8 rounded-2xl shadow-lg relative overflow-hidden group" style={primaryBgStyle}>
                    <div className="absolute top-0 right-0 p-6 opacity-10"><BarChart2 size={80} /></div>
                    <h3 className="font-bold text-2xl mb-2 relative z-10">{report.month} Review</h3>
                    <p className="text-white/80 text-sm mb-8 relative z-10 line-clamp-3">{report.aiSummary}</p>
                    <button onClick={() => setPortalReportViewing(report)} className="bg-white px-5 py-2.5 rounded-xl text-sm font-bold relative z-10 flex items-center gap-2" style={primaryTextStyle}><FileText size={16} /> Read Full Report</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Report Reader Modal for Preview */}
        {portalReportViewing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0" style={{ borderLeftWidth: 4, ...primaryBorderStyle }}>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{portalReportViewing.month} Report</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{portalReportViewing.aiSummary}</p>
                </div>
                <button onClick={() => setPortalReportViewing(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {portalReportViewing.content || 'No content available for this report.'}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
                <button onClick={() => setPortalReportViewing(null)} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={primaryBgStyle}>Close Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPublicPortal = () => {
    if (portalLoading) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-blue-600" />
            <p className="text-slate-500 text-sm font-medium">Loading your portal...</p>
          </div>
        </div>
      );
    }

    if (portalError || !activePortal || !portalClient) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 font-sans p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h1 className="text-2xl font-bold text-slate-900">Portal Access Error</h1>
            <p className="text-slate-500">{portalError || "This portal link is invalid or has been deactivated."}</p>
            <p className="text-sm text-slate-400">Please contact your account manager for a new link.</p>
          </div>
        </div>
      );
    }

    const primaryBgStyle = { backgroundColor: branding.color || '#2563eb' };
    const primaryTextStyle = { color: branding.color || '#2563eb' };
    const primaryBorderStyle = { borderColor: branding.color || '#2563eb' };

    const actionInvoices = portalInvoices.filter(i => i.status === 'Pending' || i.status === 'Overdue');
    const permissions = activePortal.permissions || {};

    return (
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col animate-in fade-in">
        <header className="bg-slate-900 text-white px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-3">
            {branding.logo ? <img src={branding.logo} alt="Logo" className="h-10 w-10 object-contain rounded bg-white p-1" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-lg" style={primaryBgStyle}>{business.name.charAt(0) || 'C'}</div>}
            <span className="font-bold text-xl hidden sm:block">{business.name || 'Client Portal'}</span>
          </div>
          <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> 
            Secure Portal
          </div>
        </header>
        <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-8 overflow-y-auto">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-20" style={primaryBgStyle}></div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 relative z-10">Welcome, {portalClient.contact?.split(' ')[0] || 'Client'}!</h1>
            <p className="text-slate-500 relative z-10 text-base">You are viewing the dashboard for {portalClient.name}.</p>
          </div>

          {/* Action Required — Pending/Overdue invoices */}
          {actionInvoices.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><AlertCircle className="text-amber-500" size={24} /> Action Required</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actionInvoices.map(inv => (
                  <div key={inv.id} className="bg-white p-6 rounded-2xl border-2 shadow-sm" style={{ borderColor: `${branding.color}40` }}>
                    <div className="flex justify-between items-start mb-4"><div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center" style={primaryTextStyle}><Receipt size={24} /></div><StatusBadge status={inv.status} /></div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">Invoice #{inv.id}</h3>
                    <p className="text-sm text-slate-500 mb-4">Due: {inv.due} • <span className="font-bold text-slate-900">${inv.amount.toLocaleString()}</span></p>
                    <button className="w-full py-2.5 text-white rounded-xl text-sm font-bold" style={primaryBgStyle}>Pay Now</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices & Payments — full section */}
          {permissions.invoices && portalInvoices.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Receipt size={24} style={primaryTextStyle} /> Invoices & Payments</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Invoice</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Due</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-50">
                    {portalInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-semibold text-slate-900">#{inv.id}</td>
                        <td className="p-4 text-slate-500">{inv.date || '—'}</td>
                        <td className="p-4 text-slate-500">{inv.due || '—'}</td>
                        <td className="p-4 font-bold text-slate-900">${inv.amount.toLocaleString()}</td>
                        <td className="p-4"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{portalInvoices.length} invoice{portalInvoices.length !== 1 ? 's' : ''} total</span>
                  <span className="text-sm font-bold text-slate-900">
                    Total Billed: ${portalInvoices.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Project Tracker */}
          {permissions.projects && portalProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><FolderKanban size={24} style={primaryTextStyle} /> Project Tracker</h2>
              {portalProjects.map(project => (
                <div key={project.id} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-bold text-xl text-slate-900">{project.name}</h3>
                      <StatusBadge status={project.status} />
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-2"><Calendar size={14} /> Target: {project.deadline || 'Ongoing'}</p>
                  </div>
                  <div className="flex-1 w-full md:max-w-sm">
                    <div className="flex justify-between text-sm font-bold mb-3"><span className="text-slate-700">Progress</span><span style={primaryTextStyle}>{project.progress}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-4 shadow-inner"><div className="h-4 rounded-full transition-all duration-1000" style={{ width: `${project.progress}%`, ...primaryBgStyle }}></div></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Reports */}
          {permissions.reports && portalReports.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Sparkles size={24} style={primaryTextStyle} /> Latest Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portalReports.map(report => (
                  <div key={report.id} className="text-white p-8 rounded-2xl shadow-lg relative overflow-hidden group" style={primaryBgStyle}>
                    <div className="absolute top-0 right-0 p-6 opacity-10"><BarChart2 size={80} /></div>
                    <h3 className="font-bold text-2xl mb-2 relative z-10">{report.month} Review</h3>
                    <p className="text-white/80 text-sm mb-8 relative z-10 line-clamp-3">{report.aiSummary}</p>
                    <button onClick={() => setPortalReportViewing(report)} className="bg-white px-5 py-2.5 rounded-xl text-sm font-bold relative z-10 flex items-center gap-2" style={primaryTextStyle}><FileText size={16} /> Read Full Report</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Files */}
          {permissions.files && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Folder size={24} style={primaryTextStyle} /> Shared Files</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {portalFiles.length > 0 ? portalFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-4 hover:bg-slate-50 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0" style={primaryTextStyle}><FileText size={20} /></div>
                        <div><p className="text-sm font-bold text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{file.size} • by {file.uploader} on {file.date}</p></div>
                      </div>
                      <button className="text-slate-400 p-2 bg-white rounded-lg border border-slate-200 text-xs font-bold flex items-center gap-2"><Download size={14} /> <span className="hidden sm:block">Download</span></button>
                    </div>
                  )) : <div className="p-8 text-center text-sm text-slate-500 italic">No files shared yet.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
        <footer className="p-8 text-center border-t border-slate-200 bg-white">
          <p className="text-slate-400 text-xs">Powered by ClientDeck • Secure Portal Technology</p>
        </footer>

        {/* Report Reader Modal */}
        {portalReportViewing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0" style={{ borderLeftWidth: 4, ...primaryBorderStyle }}>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{portalReportViewing.month} Report</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{portalReportViewing.aiSummary}</p>
                </div>
                <button onClick={() => setPortalReportViewing(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {portalReportViewing.content || 'No content available for this report.'}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end">
                <button onClick={() => setPortalReportViewing(null)} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={primaryBgStyle}>Close Report</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isPortalView) return renderPublicPortal();

  if (previewPortalId) return renderPortalPreview();

  // --- AUTH LOADING STATE ---
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // --- AUTH GATE ---
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 shadow-lg shadow-blue-600/30">C</div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ClientDeck</h1>
            <p className="text-slate-500 mt-2">Manage clients, projects & invoices in one place.</p>
          </div>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1">
              <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sign In</button>
              <button onClick={() => { setAuthMode('signup'); setAuthError(''); }} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sign Up</button>
            </div>
            {authError && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${authError.startsWith('success:') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {authError.startsWith('success:') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {authError.replace('success:', '')}
              </div>
            )}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
                <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required minLength={6} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="••••••••" />
              </div>
              <button type="submit" disabled={authSubmitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                {authSubmitting && <Loader2 size={16} className="animate-spin" />}
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
          <p className="text-center text-xs text-slate-400 mt-6">Powered by Supabase • Secure Authentication</p>
        </div>
      </div>
    );
  }

  // --- DATA LOADING STATE ---
  if (dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-sans">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 relative">

      {/* GLOBAL TOAST */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-8 duration-300">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">ClientDeck</span>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const count = sidebarCounts[item.id] || 0;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                {item.name}
                {count > 0 && (
                  <span className="ml-auto bg-red-500 text-white font-bold text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
                    {count >= 10 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 capitalize hidden sm:block">{activeTab.replace('-', ' ')}</h1>
          </div>
          <div className="flex items-center gap-3 md:gap-5">
            {timer.isRunning && (
              <div className="hidden md:flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse border border-red-100 cursor-pointer" onClick={() => setActiveTab('time')}>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                {formatTime(timer.seconds)}
              </div>
            )}
            <button onClick={() => setIsGlobalSearchOpen(true)} className="relative hidden md:flex items-center w-64 pl-3 pr-2 py-2 bg-slate-50 border border-slate-200/60 rounded-full text-sm hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-500 group">
              <Search className="text-slate-400 w-4 h-4 mr-2 group-hover:text-blue-500" />
              <span className="flex-1 text-left">Search anything...</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-sm">⌘K</kbd>
            </button>
            <div className="relative">
              <button onClick={() => { setIsNotificationMenuOpen(!isNotificationMenuOpen); setIsProfileMenuOpen(false); }} className={`relative p-2 rounded-full transition-colors ${isNotificationMenuOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                <Bell size={20} />
                {unreadNotificationsCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
              </button>
              {isNotificationMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationMenuOpen(false)}></div>
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col animate-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-900">Notifications</h3>
                      {unreadNotificationsCount > 0 && <button onClick={markAllNotificationsRead} className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"><Check size={14} /> Mark all read</button>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificationsList.map(notif => {
                        const Icon = notif.icon;
                        return (
                          <div key={notif.id} className={`p-4 hover:bg-slate-50 cursor-pointer flex gap-3 border-b border-slate-50 ${!notif.read ? 'bg-blue-50/30' : ''}`} onClick={() => setNotificationsList(notificationsList.map(n => n.id === notif.id ? { ...n, read: true } : n))}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.bg} ${notif.color}`}><Icon size={18} /></div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${!notif.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{notif.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.desc}</p>
                              <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                            </div>
                            {!notif.read && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5"></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button onClick={() => { setIsProfileMenuOpen(!isProfileMenuOpen); setIsNotificationMenuOpen(false); }} className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-transform hover:scale-105">
                {profile.avatar ? <img src={profile.avatar} alt="Profile" className="w-9 h-9 rounded-full object-cover shadow-sm ring-1 ring-slate-200" /> : <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-slate-200">{(profile.name || session?.user?.email || 'U').charAt(0).toUpperCase()}</div>}
              </button>
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 mb-1"><p className="text-sm font-bold text-slate-900 truncate">{profile.name || session?.user?.email}</p><p className="text-xs text-slate-500 truncate">{profile.email || session?.user?.email}</p></div>
                    <button onClick={() => { setActiveTab('settings'); setIsProfileMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Settings size={16} className="text-slate-400" /> Workspace Settings</button>
                    <button onClick={() => { setIsProfileMenuOpen(false); showNotification("Opening Help Center..."); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><HelpCircle size={16} className="text-slate-400" /> Help & Support</button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button onClick={() => { setIsProfileMenuOpen(false); handleSignOut(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><LogOut size={16} className="text-red-400" /> Sign Out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && renderDashboardView()}
            {activeTab === 'clients' && renderClientsView()}
            {activeTab === 'projects' && renderProjectsView()}
            {activeTab === 'invoices' && renderInvoicesView()}
            {activeTab === 'settings' && renderSettingsView()}
            {activeTab === 'proposals' && renderProposalsView()}
            {activeTab === 'time' && renderTimeView()}
            {activeTab === 'reports' && renderReportsView()}
            {activeTab === 'portals' && renderPortalsView()}
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════
          ALL MODALS
      ═══════════════════════════════════════════════════════ */}

      {/* GLOBAL SEARCH */}
      {isGlobalSearchOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-start justify-center pt-[15vh] px-4 animate-in fade-in zoom-in-95 duration-200" onClick={() => setIsGlobalSearchOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 py-4 border-b border-slate-100">
              <Search className="text-blue-500 w-6 h-6 mr-3 shrink-0" />
              <input autoFocus type="text" value={globalSearchQuery} onChange={e => setGlobalSearchQuery(e.target.value)} placeholder="Search clients, projects, or invoices..." className="flex-1 text-lg outline-none placeholder:text-slate-400 text-slate-900 font-medium bg-transparent" />
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-bold text-slate-400 bg-slate-100 rounded border border-slate-200 ml-3">ESC</kbd>
            </div>
            {globalSearchQuery && (
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {globalSearchResults.length > 0 ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Results</div>
                    {globalSearchResults.map((result) => {
                      const Icon = result.icon;
                      return (
                        <button key={result.id} onClick={result.action} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-blue-50 rounded-xl transition-colors group text-left">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 shrink-0"><Icon size={20} /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700">{result.title}</p><p className="text-xs text-slate-500 truncate">{result.type} • {result.desc}</p></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500"><Database className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-sm">No results for "{globalSearchQuery}"</p></div>
                )}
              </div>
            )}
            {!globalSearchQuery && <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"><span>Type to search across clients, projects and invoices</span><span>ClientDeck Search</span></div>}
          </div>
        </div>
      )}

      {/* AI REPORTS WIZARD */}
      {wizardState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
              <div><h3 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-blue-400" size={24} /> Report Generator</h3><p className="text-slate-400 text-sm mt-1">Step {wizardState.step} of 3</p></div>
              <button onClick={() => setWizardState({ isOpen: false, step: 1, clientId: '', source: '', rawData: '' })} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            {wizardState.step === 1 && (
              <div className="p-8 space-y-6">
                <h4 className="text-lg font-bold text-slate-900">Who is this report for?</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clients.map(client => (
                    <div key={client.id} onClick={() => setWizardState({ ...wizardState, clientId: client.id, step: 2 })} className="border-2 border-slate-100 hover:border-blue-500 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold">{client.name.charAt(0)}</div>
                      <div className="font-medium text-slate-900">{client.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wizardState.step === 2 && (
              <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6"><button onClick={() => setWizardState({ ...wizardState, step: 1 })} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></button><h4 className="text-lg font-bold text-slate-900">Select Data Source</h4></div>
                {!wizardState.source ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[{ label: 'Google Analytics', sub: 'CSV Export', icon: LineChart }, { label: 'Meta Ads', sub: 'API Import', icon: Database }, { label: 'Paste Text', sub: 'Raw Notes', icon: FileText }].map(({ label, sub, icon: Icon }) => (
                      <div key={label} onClick={() => setWizardState({ ...wizardState, source: label })} className="border border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group">
                        <Icon size={32} className="mx-auto text-slate-400 group-hover:text-blue-500 mb-3" />
                        <div className="font-semibold text-slate-900">{label}</div>
                        <div className="text-xs text-slate-500 mt-1">{sub}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium border border-blue-100">
                      <span>Selected: {wizardState.source}</span>
                      <button onClick={() => setWizardState({ ...wizardState, source: '' })} className="text-blue-600 hover:underline">Change</button>
                    </div>
                    
                    {wizardState.source === 'Paste Text' ? (
                      <>
                        <label className="block text-sm font-medium text-slate-700">Upload Data File</label>
                        {!wizardState.uploadFile ? (
                          <div 
                            className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group"
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              const file = e.dataTransfer.files[0];
                              if (file) handleFileUpload(file);
                            }}
                            onClick={() => document.getElementById('reportFileInput')?.click()}
                          >
                            <input 
                              id="reportFileInput" 
                              type="file" 
                              className="hidden" 
                              accept=".csv,.xlsx,.pdf,.txt"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                              }}
                            />
                            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-500 mb-4 transition-colors">
                              <UploadCloud size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">Drag & drop your file here</h4>
                            <p className="text-sm text-slate-500 mb-4">Supports CSV, Excel, PDF, TXT</p>
                            <button className="bg-white border border-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm shadow-sm group-hover:border-blue-300 group-hover:text-blue-600">Browse Files</button>
                          </div>
                        ) : (
                          <div className="border border-slate-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-sm truncate">{wizardState.uploadFile.name}</h4>
                                <p className="text-xs text-slate-500">{(wizardState.uploadFile.size / 1024 / 1024).toFixed(2)} MB • {wizardState.uploadFile.type.split('/')[1] || 'Document'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setWizardState({ ...wizardState, uploadFile: null }); }}
                              className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Additional Instructions (Optional)</label>
                          <textarea 
                            value={wizardState.additionalInstructions || ''} 
                            onChange={(e) => setWizardState({ ...wizardState, additionalInstructions: e.target.value })} 
                            className="w-full h-24 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm" 
                            placeholder="e.g. Focus on conversion trends, highlight underperforming ad sets, suggest next steps..." 
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-slate-700">Paste your raw data or metrics here:</label>
                        <textarea value={wizardState.rawData} onChange={(e) => setWizardState({ ...wizardState, rawData: e.target.value })} className="w-full h-40 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm" placeholder="e.g. Traffic up 15%, 43 new leads..." />
                      </>
                    )}
                    
                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleGenerateReport} 
                        disabled={wizardState.source === 'Paste Text' ? (!wizardState.uploadFile && !wizardState.additionalInstructions) : !wizardState.rawData} 
                        className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                      >
                        <Wand2 size={18} /> Generate AI Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {wizardState.step === 3 && (
              <div className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative"><div className="w-20 h-20 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div><Wand2 size={24} className="text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                <div><h4 className="text-xl font-bold text-slate-900 mb-2">Analyzing Data...</h4><p className="text-slate-500">The AI is writing your insights report.</p></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI SPLIT-SCREEN EDITOR */}
      {editorState.isOpen && editorState.report && (
        <div className="fixed inset-0 bg-slate-100 z-[100] flex flex-col animate-in slide-in-from-bottom-4">
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setEditorState({ isOpen: false, report: null })} className="text-slate-400 hover:text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200"><X size={20} /></button>
              <div><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><LayoutTemplate size={18} className="text-blue-500" /> Review Report</h2><p className="text-xs text-slate-500">Client: {clients.find(c => c.id === editorState.report.clientId)?.name} | {editorState.report.month}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 flex items-center gap-1.5"><AlertCircle size={14} /> Draft Mode</span>
              <button onClick={handlePublishReport} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2"><Globe size={16} /> Publish to Portal & Send</button>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex-col hidden lg:flex">
              <div className="p-4 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2"><Database size={16} className="text-slate-500" /><h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Source Data</h3></div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600 whitespace-pre-wrap font-mono shadow-sm">{editorState.report.rawData}</div>
                <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3"><Bot size={20} className="text-blue-600 shrink-0 mt-0.5" /><p className="text-sm text-blue-800"><strong>AI Note:</strong> I drafted the document on the right from these inputs. Edit freely before publishing!</p></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-200/50 p-4 md:p-8 lg:p-12 flex justify-center">
              <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-slate-200 flex flex-col min-h-full">
                <div className="border-b border-slate-100 p-8 flex justify-between items-start">
                  <div><h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Monthly Insights</h1><p className="text-slate-500 mt-1">{editorState.report.month} Performance Review</p></div>
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl">C</div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <textarea value={editorState.report.content} onChange={(e) => setEditorState({ ...editorState, report: { ...editorState.report, content: e.target.value } })} className="w-full flex-1 resize-none focus:outline-none text-slate-700 leading-loose text-base" spellCheck="false" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE PORTAL CONFIRMATION */}
      {revokingPortal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
            <div className="p-6 text-center pt-8">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} /></div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Revoke Access?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to permanently revoke this portal link? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRevokingPortal(null)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold">Cancel</button>
                <button onClick={handleConfirmRevokePortal} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20">Revoke Link</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLIENT */}
      {isAddClientOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Building2 className="text-blue-600" size={20} /> Add New Client</h3><button onClick={() => setIsAddClientOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label><input type="text" required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Acme Corp" /></div>
                <div className="col-span-2 md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Primary Contact</label><input type="text" value={newClient.contact} onChange={e => setNewClient({ ...newClient, contact: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Jane Doe" /></div>
                <div className="col-span-2 md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label><input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="jane@example.com" /></div>
                <div className="col-span-2 md:col-span-1"><label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label><input type="tel" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="(555) 000-0000" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={newClient.status} onChange={e => setNewClient({ ...newClient, status: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="Lead">Lead</option><option value="Active">Active</option><option value="Past">Past</option></select></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Private Notes</label><textarea value={newClient.notes} onChange={e => setNewClient({ ...newClient, notes: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24" placeholder="Add background context..." /></div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddClientOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAddClientSubmit} disabled={!newClient.name} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Client</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          HIGH PRIORITY FIX #4 — CLIENT DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────── */}
      {deletingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100">
            <div className="p-6 text-center pt-8">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50"><AlertTriangle size={28} /></div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Delete Client?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                You are about to permanently delete <strong className="text-slate-900">{deletingClient.name}</strong>. Their associated projects, invoices, and proposals may also be affected. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingClient(null)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold transition-colors">Cancel</button>
                <button onClick={handleConfirmDeleteClient} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-600/20">Delete Client</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          HIGH PRIORITY FIX #3 — TASK DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────── */}
      {deletingProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Project?</h3>
              <p className="text-slate-500 mb-8 px-4">Are you sure you want to delete <span className="font-bold text-slate-900">"{deletingProject.name}"</span>? This will also permanently delete all associated tasks. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingProject(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">Cancel</button>
                <button onClick={handleConfirmDeleteProject} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-600/20">Delete Project</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
            <div className="p-6 text-center pt-8">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} /></div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Delete Task?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Are you sure you want to delete <strong className="text-slate-900">"{deletingTask.title}"</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingTask(null)} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold">Cancel</button>
                <button onClick={handleConfirmDeleteTask} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20">Delete Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          HIGH PRIORITY FIX #3 — TASK EDIT MODAL
      ───────────────────────────────────────────────────────── */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Edit2 className="text-blue-600" size={18} /> Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label>
                <input autoFocus type="text" required value={editingTask.title} onChange={e => setEditingTask({ ...editingTask, title: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={editingTask.status} onChange={e => setEditingTask({ ...editingTask, status: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Review">In Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (optional)</label>
                  <input type="date" value={editingTask.dueDate || ''} onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assignee (optional)</label>
                  <input type="text" value={editingTask.assignee || ''} onChange={e => setEditingTask({ ...editingTask, assignee: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. John D." />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleEditTaskSubmit} disabled={!editingTask.title} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT TIME ENTRY */}
      {editingTimeEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Timer className="text-blue-600" size={20} /> Edit Time Entry
              </h3>
              <button onClick={() => setEditingTimeEntry(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Task Description *</label>
                <input type="text" autoFocus required value={editingTimeEntry.task} onChange={e => setEditingTimeEntry({ ...editingTimeEntry, task: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <select value={editingTimeEntry.projectId || ''} onChange={e => setEditingTimeEntry({ ...editingTimeEntry, projectId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="">General (No Project)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
                  <input type="number" min="0" value={editingTimeEntry.hours} onChange={e => setEditingTimeEntry({ ...editingTimeEntry, hours: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minutes</label>
                  <input type="number" min="0" max="59" value={editingTimeEntry.minutes} onChange={e => setEditingTimeEntry({ ...editingTimeEntry, minutes: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={editingTimeEntry.date} onChange={e => setEditingTimeEntry({ ...editingTimeEntry, date: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingTimeEntry(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleEditTimeEntrySubmit} disabled={!editingTimeEntry.task} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TASK */}
      {isAddTaskOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><GripVertical className="text-blue-600" size={20} /> Add New Task</h3><button onClick={() => setIsAddTaskOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Task Title *</label><input type="text" autoFocus required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Design Wireframes" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Column</label><select value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="To Do">To Do</option><option value="In Progress">In Progress</option><option value="In Review">In Review</option><option value="Done">Done</option></select></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date (optional)</label>
                  <input type="date" value={newTask.dueDate || ''} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assignee (optional)</label>
                  <input type="text" value={newTask.assignee || ''} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. John D." />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddTaskOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAddTaskSubmit} disabled={!newTask.title} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          HIGH PRIORITY FIX #1 — CREATE INVOICE WITH LINE ITEMS
      ───────────────────────────────────────────────────────── */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Receipt className="text-blue-600" size={20} /> Create New Invoice</h3>
              <button onClick={() => setIsCreateInvoiceOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Client & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                  <select value={newInvoice.clientId} onChange={e => setNewInvoice({ ...newInvoice, clientId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="">Select a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <input type="date" value={newInvoice.due} onChange={e => setNewInvoice({ ...newInvoice, due: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Recurring Schedule</label>
                  <select value={newInvoice.recurring} onChange={e => setNewInvoice({ ...newInvoice, recurring: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="none">None</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Line Items</label>
                  <button type="button" onClick={handleAddLineItem} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"><Plus size={14} /> Add Item</button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-3 text-right">Unit Price</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>
                  {/* Line item rows */}
                  <div className="divide-y divide-slate-100">
                    {newInvoice.lineItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center group">
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Item description"
                            value={item.description}
                            onChange={e => handleLineItemChange(item.id, 'description', e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={e => handleLineItemChange(item.id, 'quantity', e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          />
                        </div>
                        <div className="col-span-3">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={e => handleLineItemChange(item.id, 'unitPrice', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <span className="text-sm font-bold text-slate-900">${((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}</span>
                          {newInvoice.lineItems.length > 1 && (
                            <button type="button" onClick={() => handleRemoveLineItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-0.5"><X size={14} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tax & Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-medium text-slate-900">${calcInvoiceSubtotal(newInvoice.lineItems).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm gap-3">
                    <span className="text-slate-600 shrink-0">Tax (%)</span>
                    <div className="relative flex-1 max-w-[80px]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={newInvoice.tax}
                        onChange={e => setNewInvoice({ ...newInvoice, tax: e.target.value })}
                        className="w-full p-1.5 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500/50 bg-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base">
                    <span className="text-slate-900">Total</span>
                    <span className="text-blue-600">${calcInvoiceTotal(newInvoice.lineItems, newInvoice.tax).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms / Notes</label>
                <textarea value={newInvoice.notes} onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" placeholder="e.g. Payment due within 14 days. Bank transfer preferred." />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-sm text-slate-500">Total: <strong className="text-slate-900 text-base">${calcInvoiceTotal(newInvoice.lineItems, newInvoice.tax).toFixed(2)}</strong></span>
              <div className="flex gap-3">
                <button onClick={() => setIsCreateInvoiceOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleCreateInvoiceSubmit} disabled={!newInvoice.clientId || calcInvoiceTotal(newInvoice.lineItems, newInvoice.tax) <= 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                  <Send size={16} /> Send Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          HIGH PRIORITY FIX #2 — ADD PROPOSAL WITH FULL BODY FIELDS
      ───────────────────────────────────────────────────────── */}
      {isAddProposalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileSignature className="text-blue-600" size={20} /> New Proposal</h3>
              <button onClick={() => setIsAddProposalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Title *</label>
                  <input type="text" required value={newProposal.title} onChange={e => setNewProposal({ ...newProposal, title: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Q4 Marketing Retainer" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                  <select value={newProposal.clientId} onChange={e => setNewProposal({ ...newProposal, clientId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="">Select a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value ($)</label>
                  <input type="number" value={newProposal.value} onChange={e => setNewProposal({ ...newProposal, value: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="5000" />
                </div>
              </div>

              {/* Introduction */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Introduction</label>
                <textarea value={newProposal.introduction} onChange={e => setNewProposal({ ...newProposal, introduction: e.target.value })} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" placeholder="A short personalized opening message to the client..." />
              </div>

              {/* Scope of Work */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scope of Work</label>
                <textarea value={newProposal.scopeOfWork} onChange={e => setNewProposal({ ...newProposal, scopeOfWork: e.target.value })} rows={3} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" placeholder="Describe the full scope and objectives..." />
              </div>

              {/* Deliverables */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Deliverables</label>
                  <button type="button" onClick={() => handleAddDeliverable(setNewProposal)} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"><Plus size={13} /> Add</button>
                </div>
                <div className="space-y-2">
                  {(newProposal.deliverables || ['']).map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <input type="text" value={d} onChange={e => handleDeliverableChange(setNewProposal, i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" placeholder={`Deliverable ${i + 1}`} />
                      {(newProposal.deliverables || []).length > 1 && (
                        <button type="button" onClick={() => handleRemoveDeliverable(setNewProposal, i)} className="text-slate-300 hover:text-red-500 p-1 transition-colors"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline & Payment Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                  <input type="text" value={newProposal.timeline} onChange={e => setNewProposal({ ...newProposal, timeline: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. 6 weeks" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <input type="text" value={newProposal.paymentTerms} onChange={e => setNewProposal({ ...newProposal, paymentTerms: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. 50% upfront" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={newProposal.status} onChange={e => setNewProposal({ ...newProposal, status: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Accepted">Accepted</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddProposalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAddProposalSubmit} disabled={!newProposal.title || !newProposal.clientId} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Proposal</button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          HIGH PRIORITY FIX #2 — EDIT PROPOSAL WITH FULL BODY FIELDS
      ───────────────────────────────────────────────────────── */}
      {editingProposal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileSignature className="text-blue-600" size={20} /> Edit Proposal</h3>
              <button onClick={() => setEditingProposal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Title *</label>
                  <input type="text" required value={editingProposal.title} onChange={e => setEditingProposal({ ...editingProposal, title: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                  <select value={editingProposal.clientId} onChange={e => setEditingProposal({ ...editingProposal, clientId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="">Select a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value ($)</label>
                  <input type="number" value={editingProposal.value} onChange={e => setEditingProposal({ ...editingProposal, value: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Introduction</label>
                <textarea value={editingProposal.introduction || ''} onChange={e => setEditingProposal({ ...editingProposal, introduction: e.target.value })} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" placeholder="A short personalized opening message..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scope of Work</label>
                <textarea value={editingProposal.scopeOfWork || ''} onChange={e => setEditingProposal({ ...editingProposal, scopeOfWork: e.target.value })} rows={3} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" placeholder="Describe the full scope..." />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700">Deliverables</label>
                  <button type="button" onClick={() => handleAddDeliverable(setEditingProposal)} className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"><Plus size={13} /> Add</button>
                </div>
                <div className="space-y-2">
                  {(editingProposal.deliverables || ['']).map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                      <input type="text" value={d} onChange={e => handleDeliverableChange(setEditingProposal, i, e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50" placeholder={`Deliverable ${i + 1}`} />
                      {(editingProposal.deliverables || []).length > 1 && (
                        <button type="button" onClick={() => handleRemoveDeliverable(setEditingProposal, i)} className="text-slate-300 hover:text-red-500 p-1"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                  <input type="text" value={editingProposal.timeline || ''} onChange={e => setEditingProposal({ ...editingProposal, timeline: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. 6 weeks" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                  <input type="text" value={editingProposal.paymentTerms || ''} onChange={e => setEditingProposal({ ...editingProposal, paymentTerms: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. 50% upfront" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={editingProposal.status} onChange={e => setEditingProposal({ ...editingProposal, status: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Accepted">Accepted</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingProposal(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleEditProposalSubmit} disabled={!editingProposal.title || !editingProposal.clientId} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROJECT */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FolderKanban className="text-blue-600" size={20} /> New Project</h3><button onClick={() => setIsAddProjectOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Project Name *</label><input type="text" required value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Website Redesign" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Assign to Client *</label><select value={newProject.clientId} onChange={e => setNewProject({ ...newProject, clientId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="">Select a client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label><input type="number" value={newProject.budget} onChange={e => setNewProject({ ...newProject, budget: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="10000" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label><input type="date" value={newProject.deadline} onChange={e => setNewProject({ ...newProject, deadline: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsAddProjectOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleAddProjectSubmit} disabled={!newProject.name || !newProject.clientId} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Project</button>
            </div>
          </div>
        </div>
      )}

      {/* LOG TIME MANUALLY */}
      {isManualTimeOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock className="text-blue-600" size={20} /> Log Time Manually</h3><button onClick={() => setIsManualTimeOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Task Description *</label><input type="text" required value={manualTime.task} onChange={e => setManualTime({ ...manualTime, task: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="e.g. Client Call" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Project</label><select value={manualTime.projectId} onChange={e => setManualTime({ ...manualTime, projectId: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="">No Project (General)</option>{computedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Hours</label><input type="number" min="0" value={manualTime.hours} onChange={e => setManualTime({ ...manualTime, hours: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="0" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Minutes</label><input type="number" min="0" max="59" value={manualTime.minutes} onChange={e => setManualTime({ ...manualTime, minutes: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="0" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" value={manualTime.date} onChange={e => setManualTime({ ...manualTime, date: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" /></div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsManualTimeOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleManualTimeSubmit} disabled={!manualTime.task || (!manualTime.hours && !manualTime.minutes)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Save Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* AI CONFIG */}
      {isAiConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Bot className="text-blue-600" size={20} /> System Instructions</h3><button onClick={() => setIsAiConfigOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Tell the AI how to behave when analyzing your uploaded data.</p>
              <textarea className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsAiConfigOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => setIsAiConfigOpen(false)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Save size={16} /> Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW CLIENT PORTAL */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Globe className="text-blue-600" size={20} /> New Client Portal</h3><button onClick={() => setIsPortalModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Client</label>
                <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" value={newPortalClient} onChange={(e) => setNewPortalClient(e.target.value)}>
                  <option value="">Select a client...</option>
                  {clients.filter(c => !portals.some(p => p.clientId === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsPortalModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleCreatePortal} disabled={!newPortalClient} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Link size={16} /> Generate Link</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INVITE TEAM MEMBER */}
      {isInviteMemberOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0"><h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><UserPlus className="text-blue-600" size={20} /> Invite Team Member</h3><button onClick={() => setIsInviteMemberOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
            <div className="p-6 overflow-y-auto space-y-5">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label><input type="email" required value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="colleague@agency.com" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Access Role</label>
                <div className="space-y-3">
                  {[{ value: 'Editor', desc: 'Can create projects, send invoices. Cannot access settings.' }, { value: 'Viewer', desc: 'Can only view projects and tasks. Cannot see financial data.' }].map(({ value, desc }) => (
                    <label key={value} className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${newMember.role === value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="mt-0.5"><input type="radio" name="role" value={value} checked={newMember.role === value} onChange={e => setNewMember({ ...newMember, role: e.target.value })} className="w-4 h-4 text-blue-600" /></div>
                      <div><div className="font-bold text-slate-900 text-sm">{value}</div><div className="text-xs text-slate-500 mt-0.5">{desc}</div></div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsInviteMemberOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleInviteMemberSubmit} disabled={!newMember.email} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Send size={16} /> Send Invite</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE WORKSPACE */}
      {isDeleteWorkspaceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100">
            <div className="p-6 text-center pt-8">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50 shadow-inner"><AlertTriangle size={32} /></div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Delete Workspace?</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">You are about to permanently delete <strong>{business.name}</strong>. All clients, projects, invoices, and files will be wiped. This cannot be recovered.</p>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">Type <span className="text-red-600 font-mono select-none">DELETE</span> to confirm</label>
                <input type="text" value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono" placeholder="DELETE" autoFocus />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setIsDeleteWorkspaceModalOpen(false); setDeleteConfirmationText(""); }} className="flex-1 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold">Cancel</button>
                <button onClick={handleDeleteWorkspaceSubmit} disabled={deleteConfirmationText !== 'DELETE'} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20">Confirm Deletion</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
