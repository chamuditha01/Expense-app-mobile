// Supabase Edge Function: emails an account-closure PDF report via Resend.
// Deploy: supabase functions deploy send-closure-report
// Secret:  supabase secrets set RESEND_API_KEY=your_resend_key

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const REPORT_RECIPIENT = "heshanchamuditha05@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY secret is not configured");
    }

    const { accountName, closedDate, pdfBase64, filename } = await req.json();

    if (!accountName || !pdfBase64) {
      return new Response(
        JSON.stringify({ error: "accountName and pdfBase64 are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Expense App <onboarding@resend.dev>",
        to: [REPORT_RECIPIENT],
        subject: `Account Closure Report: ${accountName}`,
        html: `<p>The account <strong>${accountName}</strong> was closed on ${closedDate}.</p><p>The full expense summary is attached as a PDF.</p>`,
        attachments: [
          {
            filename: filename || `${accountName}_closure_report.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: resendData }), {
        status: resendRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
