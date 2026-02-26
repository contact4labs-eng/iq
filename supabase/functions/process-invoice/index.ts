import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── EXTRACTION PROMPT ───────────────────────────────
const EXTRACTION_PROMPT = `You are an invoice data extraction system. Extract ALL data from this invoice into the exact JSON schema below. Be thorough and precise.

RULES:
- Extract every field you can find. Use null for fields not present.
- Dates must be ISO format: YYYY-MM-DD
- Currency codes: EUR, USD, GBP, etc.
- Numbers: no commas, use decimal point (1234.56)
- Confidence: 0.0 to 1.0 for each field (1.0 = certain, 0.5 = uncertain)
- Line items: extract ALL of them
- If text is unclear, extract best guess and set confidence low
- Handle invoices in ANY language (Greek, English, German, etc.)

OUTPUT THIS EXACT JSON STRUCTURE (no markdown, no backticks, no explanation, ONLY valid JSON):
{
  "supplier_name": "string or null",
  "supplier_tax_id": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "currency": "EUR",
  "subtotal": 0.00,
  "vat_amount": 0.00,
  "tax_rate": 0.00,
  "discount_amount": 0.00,
  "shipping_amount": 0.00,
  "total_amount": 0.00,
  "payment_terms": "string or null",
  "bank_details": "string or null",
  "line_items": [
    {
      "description": "string",
      "sku": "string or null",
      "quantity": 0.00,
      "unit_of_measure": "string or null",
      "unit_price": 0.00,
      "line_total": 0.00,
      "tax_rate": 0.00,
      "discount": 0.00,
      "confidence": 0.95,
      "raw_text": "original line text from invoice"
    }
  ],
  "overall_confidence": 0.90,
  "extraction_notes": "Any issues or uncertainties noted here"
}`;

// ─── DETECT REAL MEDIA TYPE FROM FILE BYTES ──────────
function detectMediaType(bytes: Uint8Array, filename: string, storedType: string): string {
  // Check magic bytes (most reliable method)
  if (bytes.length >= 4) {
    // JPEG: starts with FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return "image/jpeg";
    }
    // PNG: starts with 89 50 4E 47 (‰PNG)
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return "image/png";
    }
    // PDF: starts with 25 50 44 46 (%PDF)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return "application/pdf";
    }
    // WebP: starts with 52 49 46 46 (RIFF) + WEBP at offset 8
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return "image/webp";
      }
    }
    // GIF: starts with 47 49 46 (GIF)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return "image/gif";
    }
    // HEIC/HEIF: ftyp box at offset 4
    if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      return "image/jpeg"; // Claude doesn't support HEIC, treat as JPEG after conversion
    }
  }

  // Fallback: check filename extension
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".webp")) return "image/webp";

  // Fallback: check stored type but with common fixes
  if (storedType && storedType !== "application/octet-stream") {
    return storedType;
  }

  // Default to JPEG (most common for camera photos)
  return "image/jpeg";
}

// ─── MAIN HANDLER ────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { file_id, company_id } = await req.json();
    if (!file_id || !company_id) {
      return errorResponse("Missing file_id or company_id", 400);
    }

    console.log(`Processing file: ${file_id} for company: ${company_id}`);

    // ── Step 1: Get file record ──
    const { data: fileRecord, error: fileError } = await supabase
      .from("files")
      .select("*")
      .eq("id", file_id)
      .single();

    if (fileError || !fileRecord) {
      return errorResponse("File record not found", 404);
    }

    // ── Step 2: Update invoice status to "processing" ──
    await supabase
      .from("invoices")
      .update({ status: "processing" })
      .eq("file_id", file_id)
      .eq("company_id", company_id);

    // ── Step 3: Download file from storage ──
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("invoices")
      .download(fileRecord.storage_path);

    if (downloadError || !fileData) {
      await setInvoiceError(file_id, company_id, "Failed to download file from storage");
      return errorResponse("File download failed", 500);
    }

    // ── Step 4: Convert to base64 ──
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length === 0) {
      await setInvoiceError(file_id, company_id, "File is empty");
      return errorResponse("PDF cannot be empty", 500);
    }

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // ── Step 5: Detect REAL media type from file bytes ──
    const mediaType = detectMediaType(
      bytes,
      fileRecord.original_filename || "",
      fileRecord.mime_type || ""
    );
    console.log(`Detected media type: ${mediaType} (stored: ${fileRecord.mime_type}, filename: ${fileRecord.original_filename})`);

    // ── Step 6: Call Claude API ──
    console.log("Calling Claude API for extraction...");
    const extraction = await callClaude(base64, mediaType);
    console.log("Extraction complete. Confidence:", extraction.overall_confidence);

    // ── Step 7: Process and store results ──
    await processExtraction(extraction, file_id, company_id);

    return new Response(
      JSON.stringify({ success: true, confidence: extraction.overall_confidence }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Processing error:", error);
    return errorResponse(error.message || "Unknown error", 500);
  }
});

// ─── CALL CLAUDE API ─────────────────────────────────
async function callClaude(base64: string, mediaType: string): Promise<any> {
  const contentType = mediaType === "application/pdf" ? "document" : "image";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: [
          {
            type: contentType,
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse JSON from response (handle potential markdown wrapping)
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in Claude response");
  }

  return JSON.parse(jsonMatch[0]);
}

// ─── PROCESS EXTRACTION RESULTS ──────────────────────
async function processExtraction(extraction: any, fileId: string, companyId: string) {
  // ── Find or create supplier ──
  let supplierId: string | null = null;

  if (extraction.supplier_name) {
    const normalizedName = extraction.supplier_name.toLowerCase().trim().replace(/\s+/g, " ");

    const { data: existing } = await supabase
      .from("suppliers")
      .select("id")
      .eq("company_id", companyId)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (existing) {
      supplierId = existing.id;
    } else {
      const { data: newSupplier } = await supabase
        .from("suppliers")
        .insert({
          company_id: companyId,
          name: extraction.supplier_name,
          normalized_name: normalizedName,
          tax_id: extraction.supplier_tax_id || null,
        })
        .select("id")
        .single();

      supplierId = newSupplier?.id || null;

      // Alert: new supplier detected
      if (supplierId) {
        await supabase.from("alerts").insert({
          company_id: companyId,
          supplier_id: supplierId,
          alert_type: "new_supplier",
          severity: "low",
          title: `New supplier: ${extraction.supplier_name}`,
          description: "First invoice received from this supplier.",
          recommended_action: "Verify supplier details are correct.",
        });
      }
    }
  }

  // ── Duplicate detection ──
  const hashInput = [
    extraction.supplier_name || "",
    extraction.invoice_number || "",
    String(extraction.total_amount || ""),
    extraction.invoice_date || "",
  ].join("-").toLowerCase();

  const encoder = new TextEncoder();
  const hashData = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
  const contentHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: duplicates } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("content_hash", contentHash)
    .neq("file_id", fileId);

  const isDuplicate = duplicates && duplicates.length > 0;

  // ── Determine status ──
  const confidence = extraction.overall_confidence || 0;
  let status: string;
  if (isDuplicate) {
    status = "flagged";
  } else if (confidence < 0.7) {
    status = "needs_review";
  } else {
    status = "extracted";
  }

  // ── Save invoice ──
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .update({
      supplier_id: supplierId,
      status: status,
      invoice_number: extraction.invoice_number || null,
      invoice_date: extraction.invoice_date || null,
      due_date: extraction.due_date || null,
      currency: extraction.currency || "EUR",
      subtotal: extraction.subtotal || null,
      vat_amount: extraction.vat_amount || null,
      tax_rate: extraction.tax_rate || null,
      discount_amount: extraction.discount_amount || null,
      shipping_amount: extraction.shipping_amount || null,
      total_amount: extraction.total_amount || null,
      payment_terms: extraction.payment_terms || null,
      extraction_confidence: confidence,
      extraction_notes: extraction.extraction_notes || null,
      raw_extraction: extraction,
      content_hash: contentHash,
      is_duplicate: isDuplicate,
      duplicate_of: isDuplicate ? duplicates![0].id : null,
    })
    .eq("file_id", fileId)
    .eq("company_id", companyId)
    .select("id")
    .single();

  if (invoiceError) {
    console.error("Invoice update error:", invoiceError);
    throw invoiceError;
  }

  const invoiceId = invoice!.id;

  // ── Save line items ──
  if (extraction.line_items && extraction.line_items.length > 0) {
    const lineItems = extraction.line_items.map((item: any, idx: number) => ({
      invoice_id: invoiceId,
      description: item.description || null,
      sku: item.sku || null,
      quantity: item.quantity || null,
      unit_of_measure: item.unit_of_measure || null,
      unit_price: item.unit_price || null,
      line_total: item.line_total || null,
      tax_rate: item.tax_rate || null,
      discount_amount: item.discount || null,
      confidence: item.confidence || null,
      raw_text: item.raw_text || null,
      sort_order: idx,
    }));

    const { error: lineError } = await supabase
      .from("invoice_line_items")
      .insert(lineItems);

    if (lineError) {
      console.error("Line items insert error:", lineError);
    }

    // ── Save price history + find/create products ──
    for (const item of extraction.line_items) {
      if (item.unit_price != null && item.quantity != null) {
        let productId: string | null = null;
        const productName = item.description || item.sku;

        if (productName) {
          const normalizedProduct = productName.toLowerCase().trim().replace(/\s+/g, " ");

          const { data: existingProduct } = await supabase
            .from("products")
            .select("id")
            .eq("company_id", companyId)
            .eq("normalized_name", normalizedProduct)
            .maybeSingle();

          if (existingProduct) {
            productId = existingProduct.id;
          } else {
            const { data: newProduct } = await supabase
              .from("products")
              .insert({
                company_id: companyId,
                name: productName,
                normalized_name: normalizedProduct,
                sku: item.sku || null,
                unit_of_measure: item.unit_of_measure || null,
              })
              .select("id")
              .single();

            productId = newProduct?.id || null;
          }
        }

        await supabase.from("price_history").insert({
          company_id: companyId,
          product_id: productId,
          supplier_id: supplierId,
          invoice_id: invoiceId,
          invoice_date: extraction.invoice_date || null,
          unit_price: item.unit_price,
          quantity: item.quantity,
          currency: extraction.currency || "EUR",
        });
      }
    }
  }

  // ── Create duplicate alert if needed ──
  if (isDuplicate) {
    await supabase.from("alerts").insert({
      company_id: companyId,
      invoice_id: invoiceId,
      alert_type: "duplicate_invoice",
      severity: "high",
      title: `Possible duplicate: Invoice ${extraction.invoice_number || "unknown"}`,
      description: `Matches an existing invoice from ${extraction.supplier_name || "unknown supplier"}.`,
      recommended_action: "Compare both invoices and reject the duplicate.",
      evidence: { matching_invoice_id: duplicates![0].id, content_hash: contentHash },
    });
  }

  // ── Create low confidence alert if needed ──
  if (confidence < 0.7) {
    await supabase.from("alerts").insert({
      company_id: companyId,
      invoice_id: invoiceId,
      alert_type: "low_confidence_extraction",
      severity: "medium",
      title: `Low confidence extraction (${Math.round(confidence * 100)}%)`,
      description: extraction.extraction_notes || "Some fields may be inaccurate.",
      recommended_action: "Manually review and correct extracted data.",
    });
  }
}

// ─── HELPER: Set error status on invoice ─────────────
async function setInvoiceError(fileId: string, companyId: string, errorMsg: string) {
  await supabase
    .from("invoices")
    .update({
      status: "needs_review",
      extraction_notes: `Error: ${errorMsg}`,
    })
    .eq("file_id", fileId)
    .eq("company_id", companyId);
}

// ─── HELPER: Error response ──────────────────────────
function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}