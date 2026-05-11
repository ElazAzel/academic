$files = @(
  "components\instructor\quiz-edit-form.tsx",
  "components\instructor\module-edit-form.tsx",
  "components\instructor\lesson-edit-form.tsx",
  "components\instructor\assignment-edit-form.tsx"
)

foreach ($file in $files) {
  $content = Get-Content -LiteralPath $file -Raw
  $original = $content

  # Add success state after message state
  $content = $content -replace 'const \[message, setMessage\] = useState\(""\);', 'const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(true);'

  # Add setSuccess(true) after if (response.ok) { setMessage
  $content = $content -replace '(?<=if \(response\.ok\) \{\s*setMessage\(".*"\);)', '$1
        setSuccess(true);'

  # Add setSuccess(false) in else branch
  $content = $content -replace '(?<=setMessage\(errData\.error\?\.message \|\| "Ошибка при обновлении"\);)', '$1
        setSuccess(false);'

  # Add setSuccess(false) in catch
  $content = $content -replace '(?<=setMessage\("Ошибка сети"\);)', '$1
      setSuccess(false);'

  # Replace includes("успешно") with success
  $content = $content -replace 'message\.includes\("успешно"\)', 'success'

  if ($content -ne $original) {
    Set-Content -LiteralPath $file -Value $content -NoNewline
    Write-Host ("Fixed: " + $file)
  }
}
