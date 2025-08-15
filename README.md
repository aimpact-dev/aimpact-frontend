# AImpact

## Description

AImpact is an AI-powered platform that makes Web3 development easy and accessible. Instead of writing code, users can simply describe their app idea in plain language — and AImpact turns it into a working blockchain application.

It removes the usual coding barriers, speeds up development, and still delivers secure, functional Web3 apps. 


## ICP Deployment

Users can build and deploy their app on the Internet Computer by simply describing their app idea in plain language. AImpact then turns it into a working blockchain application, which can be deployed to the Internet Computer network with one click.

Here's a canister link from demo: https://jjo5i-kyaaa-aaaak-qukxa-cai.icp0.io/

## Whitepaper

Our whitepaper is available [here](https://github.com/aimpact-dev/whitepaper/blob/main/main.pdf).

## Project setup

1) Install dependencies via pnpm:
```bash
$ pnpm install
```
2) Copy env into .env.local from https://www.notion.so/Credentials-1ec3527ea1b080ef84d9c641ea1e403a and place it in the root directory.

## How to run locally

1) In .env.local set PUBLIC_BACKEND_URL to `http://localhost:8000`.
2) Run the frontend with the command below. Make sure that the backend is running as well.
```bash
$ npm run dev
```
Current frontend tends to load slowly, and you may need to reload the page sometimes.
