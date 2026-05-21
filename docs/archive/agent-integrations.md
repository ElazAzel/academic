# AI Agent Integrations

## Agentic (Cluster444/agentic)
URL: https://github.com/Cluster444/agentic
Установка: `npx -y agentic-cli pull`
Требования: OpenCode CLI, Node.js 20+

## OpenAgentsControl (darrenhinde/OpenAgentsControl)
URL: https://github.com/darrenhinde/OpenAgentsControl
Установка: `curl -fsSL https://raw.githubusercontent.com/darrenhinde/OpenAgentsControl/main/install.sh | bash`
Требования: OpenCode CLI, Bash 3.2+

## Установка

### На Windows (Git Bash / WSL)

```bash
# Agentic
npx -y agentic-cli pull

# OpenAgentsControl (через Git Bash)
curl -fsSL https://raw.githubusercontent.com/darrenhinde/OpenAgentsControl/main/install.sh | bash -s developer
```

### На macOS / Linux

```bash
# Agentic
npx -y agentic-cli pull

# OpenAgentsControl
curl -fsSL https://raw.githubusercontent.com/darrenhinde/OpenAgentsControl/main/install.sh | bash -s developer
```

## После установки

После успешной установки будут доступны команды через `/` в OpenCode:
- Agentic: `/ticket`, `/research`, `/plan`, `/execute`, `/commit`, `/review`
- OAC: `/add-context`, `/commit`, `/test`, `/optimize`, `/context`
