import { getConfig } from './db';

interface SendReportEmailInput {
  recipient: string;
  companyName: string;
  orderId: string;
  markdown: string;
}

interface SendReportEmailResult {
  provider: string;
  status: 'sent' | 'mock_sent';
  providerMessageId?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markdownToEmailHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);
  return `
    <div style="background:#f6f7f5;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f3437">
      <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e6e2">
        <div style="background:#1f3437;color:#fff;padding:20px 24px">
          <div style="font-size:18px;font-weight:700">鉴源 · GenSight</div>
          <div style="font-size:12px;color:#b7c7c7;margin-top:4px">汽车产业深度分析报告</div>
        </div>
        <div style="padding:24px;font-size:13px;line-height:1.75;white-space:pre-wrap">${escaped}</div>
        <div style="border-top:1px solid #e2e6e2;padding:14px 24px;color:#8c9e9f;font-size:11px">
          本报告基于公开资料生成，不构成投资建议。请结合原始披露文件独立核验。
        </div>
      </div>
    </div>`;
}

export async function sendReportEmail(
  input: SendReportEmailInput
): Promise<SendReportEmailResult> {
  const apiKey = getConfig('RESEND_API_KEY') || '';
  const from = getConfig('EMAIL_FROM') || 'GenSight <reports@example.com>';

  if (!apiKey) {
    console.info(
      `[email:mock] report ${input.orderId} for ${input.companyName} prepared for ${input.recipient}`
    );
    return { provider: 'mock', status: 'mock_sent' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.recipient],
      subject: `【鉴源】${input.companyName} 汽车产业深度分析报告`,
      html: markdownToEmailHtml(input.markdown),
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email provider error (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as { id?: string };
  return {
    provider: 'resend',
    status: 'sent',
    providerMessageId: payload.id,
  };
}
