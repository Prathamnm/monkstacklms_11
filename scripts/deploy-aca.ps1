param(
  [string]$ResourceGroup = "rg-moonshine-lms",
  [string]$Location = "centralindia",
  [string]$AcrName = "acrmoonshinelms",
  [string]$ContainerEnvName = "acae-moonshine-lms",
  [string]$ContainerAppName = "aca-moonshine-lms",
  [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "Ensuring Azure CLI containerapp extension..."
az extension add --name containerapp --upgrade | Out-Null

Write-Host "Creating resource group..."
az group create --name $ResourceGroup --location $Location | Out-Null

Write-Host "Creating Azure Container Registry..."
az acr create `
  --resource-group $ResourceGroup `
  --name $AcrName `
  --sku Basic `
  --admin-enabled true | Out-Null

Write-Host "Fetching ACR login server..."
$acrLoginServer = az acr show --name $AcrName --query loginServer -o tsv

Write-Host "Creating Container Apps environment..."
az containerapp env create `
  --name $ContainerEnvName `
  --resource-group $ResourceGroup `
  --location $Location | Out-Null

Write-Host "Build and push image to ACR..."
az acr build `
  --registry $AcrName `
  --image "moonshine-lms:$ImageTag" `
  --file Dockerfile `
  . | Out-Null

Write-Host "IMPORTANT: set these values before continuing:"
Write-Host "  DATABASE_URL (Azure PostgreSQL Flexible Server with sslmode=require)"
Write-Host "  NEXTAUTH_SECRET"
Write-Host "  AZURE_AD_CLIENT_SECRET"
Write-Host "  ACS_CONNECTION_STRING"
Write-Host ""

$databaseUrl = Read-Host "DATABASE_URL"
$nextAuthSecret = Read-Host "NEXTAUTH_SECRET"
$azureAdClientSecret = Read-Host "AZURE_AD_CLIENT_SECRET"
$acsConnectionString = Read-Host "ACS_CONNECTION_STRING"
$nextAuthUrl = Read-Host "NEXTAUTH_URL (e.g. https://moonshine-lms.<region>.azurecontainerapps.io)"
$nextPublicClientId = Read-Host "NEXT_PUBLIC_AZURE_AD_CLIENT_ID"
$nextPublicTenantId = Read-Host "NEXT_PUBLIC_AZURE_AD_TENANT_ID"
$nextPublicRedirectUri = Read-Host "NEXT_PUBLIC_AZURE_AD_REDIRECT_URI"
$azureAdClientId = Read-Host "AZURE_AD_CLIENT_ID"
$azureAdTenantId = Read-Host "AZURE_AD_TENANT_ID"
$acsSenderAddress = Read-Host "ACS_SENDER_ADDRESS"

Write-Host "Creating/updating Container App..."
az containerapp up `
  --name $ContainerAppName `
  --resource-group $ResourceGroup `
  --environment $ContainerEnvName `
  --image "$acrLoginServer/moonshine-lms:$ImageTag" `
  --target-port 3000 `
  --ingress external `
  --query properties.configuration.ingress.fqdn -o tsv | Out-Null

Write-Host "Setting secrets..."
az containerapp secret set `
  --name $ContainerAppName `
  --resource-group $ResourceGroup `
  --secrets `
    "database-url=$databaseUrl" `
    "nextauth-secret=$nextAuthSecret" `
    "azure-ad-client-secret=$azureAdClientSecret" `
    "acs-connection-string=$acsConnectionString" | Out-Null

Write-Host "Setting runtime environment variables..."
az containerapp update `
  --name $ContainerAppName `
  --resource-group $ResourceGroup `
  --set-env-vars `
    NODE_ENV=production `
    PORT=3000 `
    RUN_MIGRATIONS=true `
    NEXTAUTH_URL="$nextAuthUrl" `
    NEXT_PUBLIC_AZURE_AD_CLIENT_ID="$nextPublicClientId" `
    NEXT_PUBLIC_AZURE_AD_TENANT_ID="$nextPublicTenantId" `
    NEXT_PUBLIC_AZURE_AD_REDIRECT_URI="$nextPublicRedirectUri" `
    AZURE_AD_CLIENT_ID="$azureAdClientId" `
    AZURE_AD_TENANT_ID="$azureAdTenantId" `
    ACS_SENDER_ADDRESS="$acsSenderAddress" `
    ACS_DRY_RUN=false `
    DATABASE_URL=secretref:database-url `
    NEXTAUTH_SECRET=secretref:nextauth-secret `
    AZURE_AD_CLIENT_SECRET=secretref:azure-ad-client-secret `
    ACS_CONNECTION_STRING=secretref:acs-connection-string | Out-Null

Write-Host "Configuring health probes..."
az containerapp update `
  --name $ContainerAppName `
  --resource-group $ResourceGroup `
  --yaml scripts/containerapp.template.yaml | Out-Null

$fqdn = az containerapp show --name $ContainerAppName --resource-group $ResourceGroup --query properties.configuration.ingress.fqdn -o tsv
Write-Host "Deployment completed: https://$fqdn"
