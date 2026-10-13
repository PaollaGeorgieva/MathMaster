# MathMaster — административен панел

Панел с React Admin за управление на потребители, учебно съдържание и тестове.

## Стартиране

От директорията `admin-frontend`:

```powershell
npm install
npm run dev -- --port 5174
```

Задай `VITE_API_URL=http://localhost:8000` във файл `.env.local`.
Използвай профил с администраторски права.

## Проверки

```powershell
npx tsc --noEmit
npm run build
```
