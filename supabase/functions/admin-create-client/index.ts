// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This is a template for the Supabase Edge Function to safely create client users

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Trata requisição OPTIONS para CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // 1. Validar JWT do autor da requisição via cliente Anon
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Cabeçalho de autorização ausente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await clientSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Criar cliente com Service Role apenas no servidor (Edge Function)
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. Confirmar que o usuário que chamou a função é de fato um Super-Admin
    const { data: isAdmin, error: adminCheckError } = await adminSupabase.rpc("fn_is_admin", {
      check_user_id: user.id,
    });

    if (adminCheckError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Acesso negado: apenas administradores podem criar clientes." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Ler corpo da requisição
    const { email, password, establishmentName, segment, phone } = await req.json();

    if (!email || !password || !establishmentName) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios ausentes: email, password, establishmentName." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Criar usuário no Supabase Auth via Admin API
    const { data: newAuthUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Já cria confirmado
      user_metadata: {
        created_by_admin: user.id,
      },
    });

    if (createAuthError || !newAuthUser.user) {
      return new Response(
        JSON.stringify({ error: createAuthError?.message || "Falha ao criar usuário no Supabase Auth." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const newUserId = newAuthUser.user.id;

    // 6. Criar estabelecimento vinculado ao novo user_id
    const { data: newEstablishment, error: estError } = await adminSupabase
      .from("establishments")
      .insert({
        user_id: newUserId,
        name: establishmentName,
        segment: segment || "bar_restaurante",
        phone: phone || null,
        status: "active",
      })
      .select()
      .single();

    if (estError) {
      // Rollback: se falhar na criação do estabelecimento, remove usuário auth criado
      await adminSupabase.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: "Falha ao criar estabelecimento: " + estError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 7. Registrar auditoria administrativa
    await adminSupabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "CREATE_CLIENT_USER",
      entity_type: "establishments",
      entity_id: newEstablishment.id,
      details: {
        created_user_id: newUserId,
        email: email,
        establishment_name: establishmentName,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUserId, email: email },
        establishment: newEstablishment,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Erro interno do servidor." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
