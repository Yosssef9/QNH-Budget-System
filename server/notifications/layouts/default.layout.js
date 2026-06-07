export function defaultLayout({
  status,
  title,
  message,
  details = {},
  recipientName = "User",
  actionText = null,
  actionUrl = null,
}) {
  const statusConfig = {
    APPROVED: {
      bg: "#dcfce7",
      color: "#166534",
      text: "✅ APPROVED",
    },

    REJECTED: {
      bg: "#fee2e2",
      color: "#991b1b",
      text: "❌ REJECTED",
    },

    ACTION_REQUIRED: {
      bg: "#fef3c7",
      color: "#92400e",
      text: "⏳ ACTION REQUIRED",
    },

    INFO: {
      bg: "#dbeafe",
      color: "#1e40af",
      text: "ℹ️ INFORMATION",
    },
  };

  const config = statusConfig[status] || statusConfig.INFO;

  const detailsRows = Object.entries(details)
    .map(
      ([key, value]) => `
        <tr>
          <td
            style="
              padding:12px;
              font-weight:600;
              background:#f9fafb;
              border:1px solid #e5e7eb;
              width:35%;
            "
          >
            ${key}
          </td>

          <td
            style="
              padding:12px;
              border:1px solid #e5e7eb;
            "
          >
            ${value ?? "-"}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>

<head>
<meta charset="utf-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>
</head>

<body
  style="
    margin:0;
    padding:30px;
    background:#f4f6f9;
    font-family:Arial,sans-serif;
  "
>

<div
  style="
    max-width:750px;
    margin:auto;
    background:white;
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 2px 12px rgba(0,0,0,.08);
  "
>

  <!-- Header -->

  <div
    style="
      background:white;
      padding:25px 30px;
      border-bottom:1px solid #e5e7eb;
    "
  >

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
    >
      <tr>

        <td width="70" valign="middle">

          <img
            src="cid:qnh-logo"
            alt="QNH Logo"
            style="
              width:55px;
              height:auto;
              display:block;
            "
          />

        </td>

        <td valign="middle">

          <div
            style="
              color:#1562A0;
              font-size:24px;
              font-weight:bold;
            "
          >
            Budget Management System
          </div>

          <div
            style="
              color:#6b7280;
              font-size:13px;
              margin-top:4px;
            "
          >
            Qassim National Hospital
          </div>

        </td>

      </tr>
    </table>

  </div>

  <!-- Status Banner -->

  <div
    style="
      background:${config.bg};
      color:${config.color};
      padding:16px 24px;
      font-size:16px;
      font-weight:bold;
      text-align:center;
    "
  >
    ${config.text}
  </div>

  <!-- Content -->

 <div
  style="
    padding:35px;
    border-left:5px solid ${config.color};
  "
>
<p
  style="
    color:#6b7280;
    margin-top:0;
    margin-bottom:15px;
    font-size:14px;
  "
>
 ${recipientName ? `Dear ${recipientName},` : "Dear User,"}
</p>
    <h2
      style="
        margin-top:0;
        margin-bottom:15px;
        color:#111827;
      "
    >
      ${title}
    </h2>

    <p
      style="
        color:#374151;
        line-height:1.8;
        font-size:15px;
        margin-bottom:25px;
      "
    >
      ${message}
    </p>

    <table
      style="
        width:100%;
        border-collapse:collapse;
      "
    >
      ${detailsRows}
    </table>
${
  actionUrl && actionText
    ? `
      <div
        style="
          margin-top:30px;
          text-align:center;
        "
      >
        <a
          href="${actionUrl}"
          style="
            background:#1562A0;
            color:white;
            text-decoration:none;
            padding:14px 28px;
            border-radius:8px;
            display:inline-block;
            font-weight:bold;
            font-size:14px;
          "
        >
          ${actionText}
        </a>
      </div>
    `
    : ""
}
  </div>

<div
  style="
    padding:0 35px 20px 35px;
    color:#9ca3af;
    font-size:12px;
    text-align:right;
  "
>
 Generated on:
${new Date().toLocaleString("en-GB")}
</div>

<!-- Footer -->

<div
  style="
    background:#f8fafc;
    border-top:1px solid #e5e7eb;
    padding:24px 30px;
  "
>

  <div
    style="
      text-align:center;
      margin-bottom:18px;
    "
  >
    <div
      style="
        color:#1562A0;
        font-size:15px;
        font-weight:700;
        margin-bottom:4px;
      "
    >
      Budget Management System
    </div>

    <div
      style="
        color:#6b7280;
        font-size:13px;
      "
    >
      Qassim National Hospital
    </div>

    <div
      style="
        width:60px;
        height:1px;
        background:#d1d5db;
        margin:16px auto 0 auto;
      "
    ></div>
  </div>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="
      font-size:13px;
      color:#4b5563;
    "
  >
    <tr>
      <td
        align="center"
        style="
          padding-bottom:10px;
        "
      >
        <strong>Information Technology Department</strong>
      </td>
    </tr>

    <tr>
      <td
        align="center"
        style="
          padding-bottom:10px;
          line-height:1.7;
        "
      >
        This is an automated notification generated by the
        Budget Management System.
      </td>
    </tr>

    <tr>
      <td
        align="center"
        style="
          padding-bottom:16px;
          line-height:1.7;
        "
      >
        For technical assistance or support, please contact
        the Information Technology Department.
      </td>
    </tr>

    <tr>
      <td
        align="center"
        style="
          padding-bottom:18px;
        "
      >
        <span
          style="
            display:inline-block;
            background:#fef2f2;
            color:#dc2626;
            border:1px solid #fecaca;
            border-radius:999px;
            padding:6px 14px;
            font-size:12px;
            font-weight:600;
          "
        >
          Please do not reply to this email
        </span>
      </td>
    </tr>
  </table>

  <div
    style="
      border-top:1px solid #e5e7eb;
      padding-top:15px;
      text-align:center;
      color:#9ca3af;
      font-size:11px;
      line-height:1.8;
    "
  >
    © ${new Date().getFullYear()} Qassim National Hospital
    <br />
    All Rights Reserved
  </div>

</div>

</body>
</html>
`;
}
