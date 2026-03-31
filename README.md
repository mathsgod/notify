# notify

CLI tool to monitor API endpoints and send notifications via Email, Gmail (OAuth2), or Slack.

## Installation

```bash
npm install -g .
```

## Usage

```bash
notify run                    # Run all checks (default: notify.json)
notify run -c myconfig.json   # Run with custom config file
notify checks list            # List all configured checks
```

## Project Structure

```
notify/
├── index.js          # CLI entry point
├── notify.json       # Configuration file
├── src/
│   ├── config.js     # Config loader
│   ├── run.js        # Run command
│   └── checks.js     # Checks command
└── package.json
```

## Configuration (notify.json)

```json
{
  "channels": {
    "email": {
      "host": "smtp.example.com",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "your-email@example.com",
        "pass": "your-password"
      },
      "from": "your-email@example.com"
    },
    "slack": {
      "webhook": "https://hooks.slack.com/services/xxx/yyy/zzz"
    },
    "gmail": {
      "email": "your-email@gmail.com",
      "clientId": "YOUR_GOOGLE_CLIENT_ID",
      "clientSecret": "YOUR_GOOGLE_CLIENT_SECRET",
      "refreshToken": "YOUR_GOOGLE_REFRESH_TOKEN"
    }
  },
  "checks": [
    {
      "name": "Check example",
      "url": "https://example.com/api/data.json",
      "method": "GET",
      "condition": {
        "field": "data",
        "operator": "length_gt",
        "value": 0
      },
      "notify": {
        "channels": ["email", "slack"],
        "to": ["recipient@example.com"],
        "subject": "Data Alert",
        "body": "Condition met!"
      }
    }
  ]
}
```

### Channels

| Channel | Description |
|---------|-------------|
| `email` | SMTP email (any provider) |
| `slack` | Slack Incoming Webhook |
| `gmail` | Gmail via Google OAuth2 |

Not all channels are required. Only configure the ones you need.

### Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `length_gt` | Array length greater than value | `data.length_gt 0` |
| `gt` | Number greater than value | `count.gt 10` |
| `lt` | Number less than value | `count.lt 5` |
| `eq` | Equals value | `status.eq "active"` |
| `neq` | Not equals value | `status.neq "error"` |
| `contains` | String contains value | `message.contains "alert"` |
| `truthy` | Value is truthy | `data.truthy` |
| `falsy` | Value is falsy | `data.falsy` |

### Notify Options

| Field | Type | Description |
|-------|------|-------------|
| `channels` | `string[]` | Which channels to notify: `["email"]`, `["slack"]`, `["gmail"]`, or any combination |
| `to` | `string[]` | Email recipients (required for email/gmail channels) |
| `subject` | `string` | Notification subject |
| `body` | `string` | Notification body |

## Setting up Gmail OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable **Gmail API**
3. Create **OAuth 2.0 Client ID** (Desktop app type)
4. Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) to get a refresh token:
   - Set scope to `https://mail.google.com/`
   - Authorize and exchange for tokens
5. Fill in `clientId`, `clientSecret`, and `refreshToken` in notify.json

## Dependencies

- [commander](https://www.npmjs.com/package/commander) - CLI framework
- [axios](https://www.npmjs.com/package/axios) - HTTP client
- [nodemailer](https://www.npmjs.com/package/nodemailer) - Email sending

## License

ISC
