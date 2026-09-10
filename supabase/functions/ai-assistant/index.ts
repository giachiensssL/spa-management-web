import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are an AI assistant for a beauty spa management system.

You may only recommend services that exist in the provided service list.
You must not provide medical advice.
You must not diagnose medical conditions.
You must not claim guaranteed treatment results.
You must not invent services, prices, packages, promotions, or customer information.
If the available information is insufficient, clearly state that the information is insufficient.
All user-facing AI responses must be written in Vietnamese.
Always include the safety principle: "Không tư vấn y khoa."`;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const AI_PROVIDER = Deno.env.get("AI_PROVIDER") || "openai";

async function callOpenAI(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("missing_key");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });
  if (!response.ok) throw new Error("api_error");
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(prompt: string): Promise<string> {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new Error("missing_key");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    }
  );
  if (!response.ok) throw new Error("api_error");
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAI(prompt: string): Promise<string> {
  if (AI_PROVIDER === "gemini") return callGemini(prompt);
  return callOpenAI(prompt);
}

// Fallback recommendation: most popular services
function fallbackRecommend(services: { id: string; name: string; description: string | null }[], customerName: string) {
  const top = services.slice(0, 2);
  return {
    suggestions: top.map((s) => ({
      name: s.name,
      reason: `Dịch vụ phổ biến tại spa, phù hợp với nhiều khách hàng. ${s.description ?? ""}`,
    })),
    fallback: true,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, created_by } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let outputContent: string | null = null;
    let outputData: Record<string, unknown> = {};
    let promptUsed = "";

    if (action === "recommend-services") {
      const { customer, customer_need, available_services } = body;
      const svcList = (available_services ?? []).map((s: { name: string; description: string | null }) => `- ${s.name}: ${s.description ?? ""}`).join("\n");
      promptUsed = `Khách hàng: ${customer?.full_name ?? "Không xác định"}
Điểm tích lũy: ${customer?.loyalty_points ?? 0}
Ghi chú: ${customer?.notes ?? "Không có"}
Nhu cầu hiện tại: ${customer_need || "Không xác định"}

Danh sách dịch vụ có sẵn:
${svcList}

Hãy gợi ý tối đa 2 dịch vụ cho khách hàng từ danh sách trên.
QUAN TRỌNG: Nếu nhu cầu của khách (VD: giảm cân) KHÔNG có trong danh sách dịch vụ, hãy chọn 2 dịch vụ khác (VD: Massage body) để thay thế. Trong phần "reason", hãy khéo léo nói rõ rằng "Spa hiện chưa có dịch vụ [nhu cầu], nhưng gợi ý dịch vụ này để giúp khách thư giãn/thay thế...".

Trả về KẾT QUẢ DUY NHẤT là định dạng JSON hợp lệ:
{"suggestions": [{"name": "tên dịch vụ trích từ danh sách", "reason": "lý do gợi ý bằng tiếng Việt"}]}
`;

      try {
        const aiResult = await callAI(promptUsed);
        const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
             outputData = { suggestions: parsed.suggestions };
             outputContent = parsed.suggestions.map((s: { name: string; reason: string }, i: number) => `Gợi ý ${i + 1}: ${s.name}\nLý do: ${s.reason}`).join("\n\n");
          } else {
             throw new Error("Invalid AI format");
          }
        } else {
          throw new Error("No JSON found");
        }
      } catch (err) {
        const fb = fallbackRecommend(available_services, customer?.full_name);
        outputData = fb;
        outputContent = fb.suggestions.map((s: { name: string; reason: string }, i: number) => `Gợi ý ${i + 1}: ${s.name}\nLý do: ${s.reason}`).join("\n\n");
      }
    } else if (action === "generate-message") {
      const { customer, message_type } = body;
      let typeDesc = "";
      if (message_type === "reminder") typeDesc = "Nhắc lịch hẹn: Xin chào chị ..., Spa xin nhắc chị có lịch hẹn vào ...";
      else if (message_type === "aftercare") typeDesc = "Cảm ơn sau dịch vụ: Cảm ơn chị đã sử dụng dịch vụ tại spa...";
      else typeDesc = "Kết nối lại khách cũ dựa trên lịch sử dịch vụ";

      promptUsed = `Loại tin nhắn: ${typeDesc}
Khách hàng: ${customer?.full_name ?? "Không xác định"}
Số điện thoại: ${customer?.phone ?? ""}
Điểm tích lũy: ${customer?.loyalty_points ?? 0}
Ghi chú: ${customer?.notes ?? "Không có"}

Hãy soạn một tin nhắn chăm sóc khách hàng bằng tiếng Việt, lịch sự, ấm áp và chuyên nghiệp.
Kết thúc bằng "Không tư vấn y khoa."`;

      try {
        outputContent = await callAI(promptUsed);
      } catch {
        // Fallback messages
        if (message_type === "reminder") {
          outputContent = `Xin chào chị ${customer?.full_name ?? ""}, Serene Spa xin nhắc chị có lịch hẹn sắp tới. Cảm ơn chị đã tin tưởng và ủng hộ spa. Không tư vấn y khoa.`;
        } else if (message_type === "aftercare") {
          outputContent = `Cảm ơn chị ${customer?.full_name ?? ""} đã sử dụng dịch vụ tại Serene Spa. Spa rất vui được đồng hành cùng chị trên hành trình chăm sóc sắc đẹp. Hẹn gặp lại chị! Không tư vấn y khoa.`;
        } else {
          outputContent = `Xin chào chị ${customer?.full_name ?? ""}, đã một thời gian kể từ lần cuối chị ghé thăm Serene Spa. Spa có nhiều dịch vụ mới và ưu đãi hấp dẫn dành cho chị. Chị ghé thăm khi nào nhé! Không tư vấn y khoa.`;
        }
      }
      outputData = { message: outputContent };
    } else if (action === "customer-summary") {
      const { customer, appointments, invoices } = body;
      const aptList = (appointments ?? []).map((a: { appointment_date: string; status: string; appointment_details?: { service: { name: string } }[] }) => {
        const svcs = (a.appointment_details ?? []).map((d) => d.service?.name).filter(Boolean).join(", ");
        return `- ${a.appointment_date} (${a.status}): ${svcs || "N/A"}`;
      }).join("\n");
      const invList = (invoices ?? []).map((i: { total_amount: number; paid_amount: number; payment_status: string }) => `- Tổng: ${i.total_amount}, Đã trả: ${i.paid_amount} (${i.payment_status})`).join("\n");

      promptUsed = `Khách hàng: ${customer?.full_name ?? "Không xác định"}
Điểm tích lũy: ${customer?.loyalty_points ?? 0}
Ghi chú: ${customer?.notes ?? "Không có"}

Lịch sử lịch hẹn:
${aptList || "Chưa có"}

Lịch sử hóa đơn:
${invList || "Chưa có"}

Hãy tóm tắt hồ sơ khách hàng bằng tiếng Việt với các phần:
- Tổng quan khách hàng
- Dịch vụ thường sử dụng
- Lần sử dụng gần nhất
- Tần suất sử dụng
- Ghi chú quan trọng

Kết thúc bằng "Không tư vấn y khoa."`;

      try {
        outputContent = await callAI(promptUsed);
      } catch {
        outputContent = `Tổng quan: Khách hàng ${customer?.full_name ?? ""} với ${appointments?.length ?? 0} lịch hẹn và ${invoices?.length ?? 0} hóa đơn. Điểm tích lũy: ${customer?.loyalty_points ?? 0}.\nDịch vụ thường sử dụng: Chưa đủ dữ liệu để phân tích chi tiết.\nLần sử dụng gần nhất: Xem lịch sử lịch hẹn.\nTần suất sử dụng: Cần thêm dữ liệu.\nGhi chú quan trọng: ${customer?.notes ?? "Không có"}.\n\nKhông tư vấn y khoa.`;
      }
      outputData = { summary: outputContent };
    } else if (action === "chat") {
      const { message, customer, available_services } = body;
      const svcList = (available_services ?? []).map((s: { name: string; description: string | null; price: number }) => `- ${s.name} (${s.price} VND): ${s.description ?? ""}`).join("\n");
      
      promptUsed = `Người dùng hỏi: ${message}
      
Thông tin Khách hàng đang chọn (nếu có): ${customer ? customer.full_name : "Không có"}

Danh sách dịch vụ của spa:
${svcList}

Hãy trả lời câu hỏi của người dùng như một trợ lý AI chuyên nghiệp của spa.
Kết thúc bằng "Không tư vấn y khoa."`;
      
      try {
        outputContent = await callAI(promptUsed);
      } catch {
        outputContent = "Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau. Không tư vấn y khoa.";
      }
      outputData = { message: outputContent };
    } else {
      return new Response(JSON.stringify({ error: "Hành động không hợp lệ." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to AI history
    if (outputContent) {
      const aiType = action === "recommend-services" ? "suggestion" : action === "generate-message" ? "message" : "summary";
      await supabase.from("ai_history").insert({
        customer_id: body.customer?.id ?? null,
        ai_type: aiType,
        input_data: body,
        output_content: outputContent,
        prompt_used: promptUsed,
        created_by: created_by ?? null,
      });
    }

    return new Response(JSON.stringify({ ...outputData, content: outputContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "AI hiện không khả dụng. Vui lòng thử lại sau." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
