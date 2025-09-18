# 简易HTTP服务器脚本
# 使用.NET创建一个基本的HTTP服务器

# 定义MIME类型处理函数
function GetContentType($filename) {
    $ext = [System.IO.Path]::GetExtension($filename).ToLower()
    switch ($ext) {
        ".html" { return "text/html" }
        ".htm" { return "text/html" }
        ".css" { return "text/css" }
        ".js" { return "application/javascript" }
        ".json" { return "application/json" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".png" { return "image/png" }
        ".gif" { return "image/gif" }
        ".svg" { return "image/svg+xml" }
        default { return "application/octet-stream" }
    }
}

$port = 8080
$path = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "HTTP服务器已启动: http://localhost:$port/"
Write-Host "服务目录: $path"
Write-Host "按Ctrl+C停止服务器..."

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $localPath = $request.Url.LocalPath
            $localPath = $localPath -replace "/", "\"
            
            if ($localPath -eq "\") {
                $localPath = "\index.html"
            }
            
            $filename = Join-Path $path $localPath.TrimStart("\")
            Write-Host "请求: $($request.Url.LocalPath) -> $filename"
            
            if (Test-Path $filename -PathType Leaf) {
                $content = [System.IO.File]::ReadAllBytes($filename)
                $response.ContentLength64 = $content.Length
                $response.ContentType = GetContentType $filename
                $response.OutputStream.Write($content, 0, $content.Length)
            } else {
                $response.StatusCode = 404
                $errorMsg = "404 - 文件不存在"
                $content = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
            }
            
            $response.Close()
        } catch {
            Write-Host "处理请求时出错: $_" -ForegroundColor Red
        }
    }
} finally {
    $listener.Stop()
    Write-Host "HTTP服务器已停止"
}
