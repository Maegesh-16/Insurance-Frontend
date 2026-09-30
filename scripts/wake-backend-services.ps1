[CmdletBinding()]
param(
    [ValidateRange(1, 10)]
    [int]$Attempts = 3,

    [ValidateRange(10, 600)]
    [int]$TimeoutSeconds = 180
)

$services = @(
    [pscustomobject]@{ Name = 'API Gateway'; Url = 'https://insurance-api-gateway-rn0g.onrender.com/health' }
    [pscustomobject]@{ Name = 'Identity'; Url = 'https://insurance-identity-service.onrender.com/swagger/index.html' }
    [pscustomobject]@{ Name = 'Customer'; Url = 'https://insurance-customer-service-mxdj.onrender.com/swagger/index.html' }
    [pscustomobject]@{ Name = 'Policy'; Url = 'https://insurance-policy-service.onrender.com/swagger/index.html' }
    [pscustomobject]@{ Name = 'Notification'; Url = 'https://notificationservice-9ko7.onrender.com/swagger/index.html' }
    [pscustomobject]@{ Name = 'Payment'; Url = 'https://paymentservice-zfth.onrender.com/swagger/index.html' }
    [pscustomobject]@{ Name = 'Premium'; Url = 'https://premiumservice-bagg.onrender.com/swagger/index.html' }
    [pscustomobject]@{ Name = 'Reporting'; Url = 'https://insurance-reporting-service.onrender.com/swagger' }
    [pscustomobject]@{ Name = 'AI Assistant'; Url = 'https://insurance-ai-assistant-service.onrender.com/health' }
    [pscustomobject]@{ Name = 'Claims'; Url = 'https://insurance-claim-service-mq7u.onrender.com/swagger' }
)

Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
$pending = @($services)
$results = @{}

try {
    for ($attempt = 1; $attempt -le $Attempts -and $pending.Count -gt 0; $attempt++) {
        Write-Host "Waking $($pending.Count) service(s), attempt $attempt of $Attempts..."

        $requests = @($pending | ForEach-Object {
            [pscustomobject]@{
                Service = $_
                Timer = [System.Diagnostics.Stopwatch]::StartNew()
                Task = $client.GetAsync($_.Url)
            }
        })

        try {
            [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$requests.Task)
        }
        catch {
            # Individual task results are evaluated below so one timeout does not hide other responses.
        }

        $failed = @()
        foreach ($request in $requests) {
            $request.Timer.Stop()
            $status = 'Failed'
            $isSuccess = $false

            if ($request.Task.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                $response = $request.Task.Result
                $status = [int]$response.StatusCode
                $isSuccess = $response.IsSuccessStatusCode
                $response.Dispose()
            }

            if ($isSuccess) {
                $results[$request.Service.Name] = [pscustomobject]@{
                    Service = $request.Service.Name
                    Status = $status
                    Seconds = [math]::Round($request.Timer.Elapsed.TotalSeconds, 1)
                    Url = $request.Service.Url
                }
            }
            else {
                $failed += $request.Service
                if ($attempt -eq $Attempts) {
                    $results[$request.Service.Name] = [pscustomobject]@{
                        Service = $request.Service.Name
                        Status = $status
                        Seconds = [math]::Round($request.Timer.Elapsed.TotalSeconds, 1)
                        Url = $request.Service.Url
                    }
                }
            }
        }

        $pending = @($failed)
    }
}
finally {
    $client.Dispose()
}

$orderedResults = @($services | ForEach-Object { $results[$_.Name] })
$orderedResults | Format-Table Service, Status, Seconds, Url -AutoSize

$unavailable = @($orderedResults | Where-Object { $_.Status -notmatch '^2\d\d$' })
if ($unavailable.Count -gt 0) {
    Write-Error "$($unavailable.Count) backend service(s) did not wake successfully."
    exit 1
}

Write-Host 'All backend services are awake.' -ForegroundColor Green
