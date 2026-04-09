<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Code</title>
</head>
<body style="margin:0; padding:0; background-color:#0e1117; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0e1117; min-height:100vh;">
        <tr>
            <td align="center" style="padding:40px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px; background-color:#161b22; border:1px solid #2d333b; border-radius:16px;">
                    <tr>
                        <td style="padding:48px 40px; text-align:center;">
                            <!-- Logo -->
                            <div style="font-size:28px; font-weight:800; color:#e8eaf0; letter-spacing:-0.5px; margin-bottom:4px;">
                                AD<span style="color:#e8ff47;">.</span>FACTORY
                            </div>
                            <div style="font-size:10px; color:#7a8399; letter-spacing:2px; text-transform:uppercase; margin-bottom:36px;">
                                LOGIN CODE
                            </div>

                            <!-- Greeting -->
                            <div style="font-size:14px; color:#c9d1d9; margin-bottom:24px;">
                                Hi {{ $userName }},
                            </div>

                            <!-- Code -->
                            <div style="background-color:#0e1117; border:1px solid #2d333b; border-radius:12px; padding:24px; margin-bottom:24px;">
                                <div style="font-size:40px; font-weight:700; color:#e8ff47; letter-spacing:12px; font-family:'Courier New', Courier, monospace;">
                                    {{ $code }}
                                </div>
                            </div>

                            <!-- Info -->
                            <div style="font-size:12px; color:#7a8399; line-height:1.6;">
                                This code expires in 10 minutes.<br>
                                If you didn't request this, you can safely ignore this email.
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <div style="margin-top:24px; font-size:10px; color:#484f58;">
                    AD.FACTORY by Creditstar Group
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
