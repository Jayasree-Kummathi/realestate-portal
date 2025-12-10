// server/src/utils/emailTemplates.js

const enquiryEmailTemplate = ({
  logoUrl,
  title,
  enquiryType,
  name,
  email,
  phone,
  message,
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${enquiryType}</title>
</head>
<body style="
  margin:0;
  padding:0;
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  background:#f4f6f8;
">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" style="
          max-width:600px;
          background:#ffffff;
          border-radius:10px;
          overflow:hidden;
          box-shadow:0 8px 25px rgba(0,0,0,0.08);
        ">

          <tr>
            <td style="
              background:linear-gradient(135deg,#ff512f,#dd2476);
              padding:20px;
              text-align:center;
            ">
               <img
      src="https://img.icons8.com/ios-filled/150/fa314a/home.png"
      alt="RealEstate Portal"
      width="120"
      style="display:block; margin:0 auto;"
    />
            </td>
          </tr>

          <tr>
            <td style="padding:25px;color:#333;">
              <h2>📩 New ${enquiryType}</h2>

              <p style="color:#555;">
                You have received a new enquiry for:
              </p>

              <p style="
                font-size:18px;
                font-weight:600;
                margin-bottom:20px;
              ">
                ${title}
              </p>

              <table width="100%" cellpadding="8" cellspacing="0" style="
                background:#f9fafb;
                border-radius:8px;
              ">
                <tr>
                  <td><b>Name:</b></td>
                  <td>${name}</td>
                </tr>

                ${email ? `
                <tr>
                  <td><b>Email:</b></td>
                  <td>${email}</td>
                </tr>
                ` : ``}

                <tr>
                  <td><b>Phone:</b></td>
                  <td>${phone}</td>
                </tr>
              </table>

              ${message ? `
              <p style="margin-top:18px;">
                <b>Message:</b><br/>
                <span style="color:#555;">${message}</span>
              </p>
              ` : ``}

              <hr style="margin:25px 0;border:none;border-top:1px solid #eee;"/>

              <p style="color:#777;font-size:13px;">
                Please respond to this enquiry as soon as possible.
              </p>
            </td>
          </tr>

          <tr>
            <td style="
              background:#f4f6f8;
              text-align:center;
              padding:15px;
              font-size:12px;
              color:#777;
            ">
              © ${new Date().getFullYear()} RealEstate Portal
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

module.exports = {
  enquiryEmailTemplate,
};
