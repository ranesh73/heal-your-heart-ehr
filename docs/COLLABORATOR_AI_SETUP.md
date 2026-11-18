# Remote AI Setup for Collaborators (Zero-Lag / Weak Laptop Guide)

If your laptop does not have a dedicated NVIDIA GPU, do not run heavy local models directly on your CPU. Instead, follow this guide to use a **Free Google Colab T4 GPU (16 GB VRAM)** to power your local Heal Your Heart EHR AI Agent while you develop inside Antigravity.

---

## How It Works

* **Your Laptop (Antigravity):** Holds all your project files, backend code, frontend UI, database, and git changes.
* **Google Colab:** Only acts as the external GPU brain running `qwen2.5:7b`. No project code or patient data is stored on Colab.

---

## 3-Minute Setup (Step-by-Step)

### Step 1: Open the Colab Notebook
1. Open Google Chrome and go to: **[colab.research.google.com](https://colab.research.google.com)**
2. Click **Upload** and upload the notebook located in the repository at:
   `scripts/ollama_colab_host.ipynb`
   *(Alternatively, create a new notebook, set Runtime to **T4 GPU**, and paste the code from below).*

### Step 2: Enable Free GPU
1. In the Colab menu, click **Runtime** > **Change runtime type**.
2. Select **T4 GPU** under Hardware accelerator.
3. Click **Save**.

### Step 3: Run the Server
1. Click the **Run (Play)** button on the code cell.
2. It will install Ollama, download `qwen2.5:7b`, and start a secure tunnel.
3. After ~1–2 minutes, it will display a box with your link:
   ```text
   ============================================================
   🎉 OLLAMA GPU HOST IS ONLINE AND READY!
   ============================================================

   👉 Copy & paste this into your local 'backend/.env' file:

   OLLAMA_BASE_URL=https://random-words-1234.trycloudflare.com
   OLLAMA_MODEL=qwen2.5:7b
   ============================================================
   ```

### Step 4: Paste into your local `.env` and Start Developing
1. Open `backend/.env` on your laptop.
2. Update `OLLAMA_BASE_URL` with the URL generated in Colab.
3. Start your backend and frontend in Antigravity as usual:
   ```bash
   cd backend && uvicorn app.main:app --reload
   ```
4. Click the **AI Copilot Drawer** in the EHR. Queries will now process through the cloud GPU with lightning speed (~25 tokens/s) with zero strain on your laptop!

---

## Important Tips
* **Keep the Colab Tab Open:** Leave the Colab browser tab open in the background while you are working in Antigravity.
* **If it disconnects after being idle:** Google Colab pauses if you don't use it for 60+ minutes. If that happens, simply click **Run** again in Colab, grab the new URL, and paste it into `backend/.env`.
