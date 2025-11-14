# 🚀 Using x402 Protocol via Aimpact

A comprehensive guide to building and deploying your application using the x402 protocol integration with Aimpact.

---

## 📋 Overview

Aimpact is a powerful platform that allows you to quickly generate Web3 applications. This guide will walk you through the full-stack apps creation with integrated payment processing via the x402 protocol: entire process, from initial setup to deployment.

---

## 🎯 Prerequisites

- A Solana wallet (Phantom, Solflare, or any compatible wallet)
- A Convex.dev account (free tier available)

---

## 📖 Step-by-Step Guide

### Step 1: Open Aimpact Platform

Navigate to the main Aimpact platform:

**👉 [aimpact.dev](https://aimpact.dev)**

This is your starting point for creating your application.

---

### Step 2: Authorize with Solana Wallet

1. Click on the wallet connection button
2. Select your preferred Solana wallet (Phantom, Solflare, etc.)
3. Approve the connection request

> **💡 Important:** The wallet address you connect will be used to receive funds from sales transactions. Make sure you're using the correct wallet!

---

### Step 3: Describe Your Project Idea

In the input area, describe your project with the following requirements:

#### ✅ Required Information:
- **Specify that you want to sell something** via the application
- **Product price** (recommended)
- **Product details** and description
- **Product link** (if applicable)

#### 📝 Sample Prompt:

```
Build a landing page for my sales funnel to sell a digital product for 0.1$ in USDC via this link: https://static.voices.com/wp-content/uploads/2025/01/shrek-scaled.jpg
```

#### ⏱️ Processing Time:
After submitting your idea, wait approximately **~5 minutes** while Aimpact generates your application using x402 integration.

> **🎨 Tip:** The more specific your description, the better the generated application will match your needs!

---

### Step 4: Configure Convex Deployment Key

To enable backend functionality, you need to configure a Convex Development Deploy Key.

#### 🔧 How to Get Your Convex Deployment Key:

1. **Create/Login to Convex Account**
   - Go to [dashboard.convex.dev](https://dashboard.convex.dev)
   - Create a new account or log in to your existing account

2. **Create a New Project**
   - Click **"Create project"** button
   - Type the project name in the input area (e.g., "Aimpact Project")

3. **Access Project Settings**
   - In your project dashboard, click on **Settings** in the left panel
   - Navigate to **URL & Deploy Key** section
   - Open the **"Show development credentials"** dropdown

4. **Generate Development Deploy Key**
   - Click **"Generate Development Deploy Key"**
   - Enter any name for your key (e.g., "Aimpact Project")
   - Click **"Save"**

5. **Copy Your Key**
   - Copy the generated **Development Deploy Key**
   - Keep it secure - you'll need it in the next step

#### 🔑 Configure in Aimpact:

1. Navigate to the **Convex** tab in your Aimpact workspace
2. Paste your Development Deploy Key into the input field
3. Click on "Save" button

---

### Step 5: Confirm Convex Configuration

1. Navigate to the Aimpact chat
2. Type a message confirming that you've configured the Convex key, for example:
   ```
   I have configured the convex key
   ```
3. Wait approximately **~2 minutes** while Aimpact applies the key to your application

> **⏳ Note:** The system needs time to integrate your Convex backend with the generated application.

---

### Step 6: Preview Your Application

1. Navigate to the **Preview** tab
2. Test your application's functionality:
   - Verify the landing page displays correctly
   - Check that payment integration is working
   - Test the product purchase flow
3. **Enjoy your working app!** 🎉

Your application is now fully functional with x402 protocol integration for payments.

---

### Step 7: (Optional) Deploy to Production

If you want to deploy your application under the `aimpact.dev` domain:

1. Click on **"Publish"** button
2. Select **"Publish to AWS"**
3. Wait ~3 minutes until it's deployed
4. Your app will be live at a custom `aimpact.dev` subdomain

> **🌐 Deployment Benefits:**
> - Public URL for your application
> - Production-ready hosting
> - SSL certificate included
> - Scalable infrastructure

---

## 🔍 Troubleshooting

### Common Issues:

- **Wallet Connection Failed:** Make sure your wallet extension is installed and unlocked
- **Convex Key Not Working:** Verify you copied the entire Development Deploy Key without extra spaces
- **App Generation Taking Too Long:** Be patient - complex applications may take longer than 5 minutes
- **Payment Not Processing:** Ensure your wallet has sufficient funds and is connected to the correct network

---

## 📚 Additional Resources

- [x402 Protocol Documentation](https://x402.dev)
- [Convex Documentation](https://docs.convex.dev)
- [Solana Wallet Guide](https://solana.com/developers/wallets)

---

## 💬 Support

If you encounter any issues or have questions, reach out to the Aimpact community:

- **Discord Community:** [Join our Discord server](https://discord.gg/MFTPPm3gwY)

---

## 🎉 You're All Set!

Congratulations! You've successfully created a sales application with x402 protocol integration. Your application is ready to accept payments in USDC and process transactions on the Solana blockchain.

**Happy selling!** 🚀

---

*Last updated: 2025*

