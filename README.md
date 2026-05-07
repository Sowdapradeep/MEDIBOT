# 🏥 MEDIBOT — AI-Powered Healthcare Platform

> An intelligent, multi-portal healthcare system connecting patients, doctors, and administrators through an AI-powered medical assistant — built on a modern TypeScript + Python stack and deployed on AWS.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Workflow](#workflow)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

MEDIBOT is a full-stack, cloud-native healthcare platform that combines an AI-driven medical chatbot with three distinct user portals — for patients, doctors, and administrators. The platform enables users to describe symptoms, receive AI-backed guidance, connect with available doctors, and manage healthcare operations end-to-end.

**Key capabilities:**
- AI-powered medical chatbot (MediBot) for symptom analysis and health Q&A
- Separate, role-based portals for patients, doctors, and admins
- Backend microservices architecture with Python-based APIs
- AWS Amplify-based deployment for all three frontend apps
- AWS Bedrock integration for LLM-powered responses

---

## Architecture

```
                        ┌──────────────────────────────────────────────────┐
                        │              AWS Cloud Infrastructure             │
                        │                                                  │
  ┌─────────────┐       │  ┌─────────────┐  ┌────────────┐  ┌──────────┐  │
  │  Patient    │──────▶│  │  patient-   │  │  doctor-   │  │  admin-  │  │
  │  (Browser)  │       │  │  app        │  │  app       │  │  portal  │  │
  └─────────────┘       │  │  (Next.js)  │  │  (Next.js) │  │ (Next.js)│  │
                        │  └──────┬──────┘  └─────┬──────┘  └────┬─────┘  │
  ┌─────────────┐       │         │                │              │        │
  │  Doctor     │──────▶│         └────────────────┴──────────────┘        │
  │  (Browser)  │       │                          │                        │
  └─────────────┘       │                   ┌──────▼──────┐                │
                        │                   │   Backend   │                │
  ┌─────────────┐       │                   │  (Python /  │                │
  │   Admin     │──────▶│                   │  FastAPI)   │                │
  │  (Browser)  │       │                   └──────┬──────┘                │
  └─────────────┘       │                          │                        │
                        │          ┌───────────────┼───────────────┐        │
                        │          │               │               │        │
                        │   ┌──────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐ │
                        │   │  MediBot   │  │  Services  │  │  Config  │ │
                        │   │ (AI Core / │  │ (Micro-    │  │ & Infra  │ │
                        │   │  Bedrock)  │  │  services) │  │ (AWS)    │ │
                        │   └────────────┘  └────────────┘  └──────────┘ │
                        └──────────────────────────────────────────────────┘
```

---

## Project Structure

```
MEDIBOT/
│
├── patient-app/          # Next.js app for patients
│   ├── pages/            #   Routes: symptom input, chat, appointments
│   ├── components/       #   Reusable UI components
│   └── ...
│
├── doctor-app/           # Next.js app for doctors
│   ├── pages/            #   Routes: patient queue, consultations, records
│   ├── components/
│   └── ...
│
├── admin-portal/         # Next.js app for administrators
│   ├── pages/            #   Routes: user management, analytics, settings
│   ├── components/
│   └── ...
│
├── backend/              # Python backend — REST API layer
│   └── ...               #   Auth, data models, business logic
│
├── medibot/              # AI chatbot core
│   └── ...               #   AWS Bedrock integration, prompt engineering
│
├── services/             # Microservices (notifications, scheduling, etc.)
│
├── infrastructure/       # AWS infrastructure definitions (CDK/CloudFormation)
│
├── config/               # Shared configuration files
│
├── .kiro/steering/       # Project AI steering documents
├── amplify.yml           # AWS Amplify build configuration
├── deploy_lambda.py      # Lambda deployment automation script
└── test_bedrock.py       # AWS Bedrock integration tests
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Patient App** | Next.js, TypeScript, React |
| **Doctor App** | Next.js, TypeScript, React |
| **Admin Portal** | Next.js, TypeScript, React |
| **Backend API** | Python (FastAPI / Flask) |
| **AI / LLM** | AWS Bedrock (Claude / Titan) |
| **Deployment** | AWS Amplify |
| **Serverless** | AWS Lambda |
| **Infrastructure** | AWS CDK / CloudFormation |
| **Languages** | TypeScript (63%), Python (37%) |

---

## Workflow

### 1. Patient Flow

```
Patient opens patient-app
        │
        ▼
  Describes symptoms / asks health question
        │
        ▼
  Request sent to Backend API
        │
        ▼
  Backend routes query to MediBot (AI Core)
        │
        ▼
  MediBot queries AWS Bedrock LLM
        │
        ▼
  AI response returned to patient UI
        │
        ▼
  Patient can book a consultation
        │
        ▼
  Appointment created → Doctor notified via Services layer
```

### 2. Doctor Flow

```
Doctor logs into doctor-app
        │
        ▼
  Views patient queue / incoming consultations
        │
        ▼
  Accesses MediBot's pre-analysis for each patient
        │
        ▼
  Conducts consultation (notes, prescriptions)
        │
        ▼
  Updates patient records via Backend API
```

### 3. Admin Flow

```
Admin logs into admin-portal
        │
        ▼
  Manages users (patients & doctors)
        │
        ▼
  Views platform analytics & logs
        │
        ▼
  Configures system settings
```

### 4. AI (MediBot) Workflow

```
User query received
        │
        ▼
  Query pre-processed (sanitised, contextualised)
        │
        ▼
  Prompt engineered with medical context
        │
        ▼
  Sent to AWS Bedrock (LLM inference)
        │
        ▼
  Response received & post-processed
        │
        ▼
  Returned to frontend via Backend API
```

### 5. Deployment Workflow

```
Developer pushes to main branch
        │
        ▼
  AWS Amplify detects change (amplify.yml)
        │
        ├──▶ Builds patient-app  (npm install → npm run build)
        ├──▶ Builds doctor-app   (npm install → npm run build)
        └──▶ Builds admin-portal (npm install → npm run build)
                │
                ▼
        Artifacts published to AWS CDN
                │
                ▼
        Backend Lambda functions updated
        via deploy_lambda.py
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.x
- Python >= 3.10
- AWS CLI configured with appropriate permissions
- AWS Amplify CLI (optional, for local simulation)

### 1. Clone the repository

```bash
git clone https://github.com/Sowdapradeep/MEDIBOT.git
cd MEDIBOT
```

### 2. Set up a frontend app (e.g., patient-app)

```bash
cd patient-app
npm install
cp .env.example .env   # Fill in your environment variables
npm run dev
```

Repeat for `doctor-app` and `admin-portal`.

### 3. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in AWS credentials, DB config, etc.
python main.py
```

### 4. Test AWS Bedrock integration

```bash
python test_bedrock.py
```

### Environment Variables

Each app and the backend will require relevant environment variables. Common ones include:

| Variable | Description |
|---|---|
| `AWS_REGION` | AWS region (e.g., `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `BEDROCK_MODEL_ID` | Bedrock model identifier |
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `DATABASE_URL` | Database connection string |

---

## Deployment

MEDIBOT uses **AWS Amplify** for frontend deployment. The `amplify.yml` at the root defines build phases for all three Next.js apps.

```yaml
# amplify.yml (summary)
version: 1
applications:
  - appRoot: patient-app
    frontend:
      phases:
        preBuild:
          commands: [npm install]
        build:
          commands: [npm run build]
      artifacts:
        baseDirectory: .next

  - appRoot: doctor-app
    ...

  - appRoot: admin-portal
    ...
```

Backend Lambda functions are deployed using:

```bash
python deploy_lambda.py
```

Infrastructure (VPCs, IAM roles, databases, etc.) is managed via the `infrastructure/` directory.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

This project is open source. See the repository for licensing details.

---

*Built with ❤️ by team inspira
