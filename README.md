# One Percent Better

A project to be 1% better every day.

## Stripe Webhook local

First install stripe CLI and login.

```
stripe login
```
Then run the following command to listen for webhook events:

```
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```
