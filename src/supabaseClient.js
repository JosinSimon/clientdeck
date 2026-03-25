import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://jzjnksydcmlbvazurezl.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6am5rc3lkY21sYnZhenVyZXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTU1OTEsImV4cCI6MjA4OTU5MTU5MX0.I3j5qGR5JU4uWm2itGXnHvALtviRh6ug06o4zR_1FgY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
