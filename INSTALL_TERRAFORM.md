# Install Terraform - Quick Guide

## Windows Installation

### Option 1: Using Winget (Fastest)

```powershell
winget install HashiCorp.Terraform
```

### Option 2: Manual Download

1. **Download:**
   - Go to: https://www.terraform.io/downloads
   - Download Windows 64-bit version
   - Extract to a folder (e.g., `C:\terraform`)

2. **Add to PATH:**
   - Open System Properties → Environment Variables
   - Add `C:\terraform` to PATH
   - Or add to PowerShell profile:
   ```powershell
   $env:Path += ";C:\terraform"
   ```

3. **Verify:**
   ```powershell
   terraform version
   ```

### Option 3: Using Chocolatey

```powershell
choco install terraform
```

---

## After Installation

1. **Verify:**
   ```powershell
   terraform version
   ```

2. **Deploy:**
   ```powershell
   cd infra/terraform
   terraform init
   terraform plan
   terraform apply
   ```

---

**Quick Install:**
```powershell
# Try winget first
winget install HashiCorp.Terraform

# Or download manually from:
# https://releases.hashicorp.com/terraform/
```


