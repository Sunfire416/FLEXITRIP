#!/bin/bash

# Dossiers à créer
directories=(
    "./src/api"
    "./src/components"
    "./src/layouts"
    "./src/hooks"
    "./src/pages"
    "./src/context"
    "./src/services"
    "./src/styles"
    "./src/utils"
    "./src/assets/images"
)

# Fichiers à créer avec du contenu par défaut si nécessaires
files=(
    "./src/api/apiService.js"
    "./src/components/Header.js"
    "./src/components/Footer.js"
    "./src/components/Button.js"
    "./src/layouts/MainLayout.js"
    "./src/hooks/useAuth.js"
    "./src/pages/Home.js"
    "./src/pages/Login.js"
    "./src/pages/Profile.js"
    "./src/context/AuthContext.js"
    "./src/services/authService.js"
    "./src/styles/globals.css"
    "./src/styles/theme.js"
    "./src/utils/formatDate.js"
    "./src/assets/images/logo.png" # Logo can be added manually later
)

# Créer les dossiers
for dir in "${directories[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "Creating directory: $dir"
        mkdir -p "$dir"
    else
        echo "Directory already exists: $dir"
    fi
done

# Créer les fichiers avec contenu par défaut si manquants
for file in "${files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Creating file: $file"
        touch "$file"
        case $file in
            "./src/api/apiService.js")
                echo "// API service logic" > "$file"
                ;;
            "./src/components/Header.js")
                echo "import React from 'react';\n\nconst Header = () => <header>Header</header>;\n\nexport default Header;" > "$file"
                ;;
            "./src/components/Footer.js")
                echo "import React from 'react';\n\nconst Footer = () => <footer>Footer</footer>;\n\nexport default Footer;" > "$file"
                ;;
            "./src/components/Button.js")
                echo "import React from 'react';\n\nconst Button = ({ children, onClick }) => <button onClick={onClick}>{children}</button>;\n\nexport default Button;" > "$file"
                ;;
            "./src/layouts/MainLayout.js")
                echo "import React from 'react';\n\nconst MainLayout = ({ children }) => <div>{children}</div>;\n\nexport default MainLayout;" > "$file"
                ;;
            "./src/hooks/useAuth.js")
                echo "import { useState } from 'react';\n\nconst useAuth = () => {\n  const [auth, setAuth] = useState(null);\n  return { auth, setAuth };\n};\n\nexport default useAuth;" > "$file"
                ;;
            "./src/pages/Home.js")
                echo "import React from 'react';\n\nconst Home = () => <div>Home Page</div>;\n\nexport default Home;" > "$file"
                ;;
            "./src/pages/Login.js")
                echo "import React from 'react';\n\nconst Login = () => <div>Login Page</div>;\n\nexport default Login;" > "$file"
                ;;
            "./src/pages/Profile.js")
                echo "import React from 'react';\n\nconst Profile = () => <div>Profile Page</div>;\n\nexport default Profile;" > "$file"
                ;;
            "./src/context/AuthContext.js")
                echo "import React, { createContext, useState } from 'react';\n\nexport const AuthContext = createContext();\n\nexport const AuthProvider = ({ children }) => {\n  const [auth, setAuth] = useState(null);\n  return <AuthContext.Provider value={{ auth, setAuth }}>{children}</AuthContext.Provider>;\n};" > "$file"
                ;;
            "./src/services/authService.js")
                echo "// Logic for authentication service" > "$file"
                ;;
            "./src/styles/globals.css")
                echo "/* Global styles */\nbody {\n  margin: 0;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n}" > "$file"
                ;;
            "./src/styles/theme.js")
                echo "export const theme = {\n  colors: {\n    primary: '#26abff',\n    secondary: '#003f5c',\n  },\n};" > "$file"
                ;;
            "./src/utils/formatDate.js")
                echo "export const formatDate = (date) => new Date(date).toLocaleDateString();" > "$file"
                ;;
        esac
    else
        echo "File already exists: $file"
    fi
done

# Vérification pour App.js, index.js et App.css
if [ ! -f "./src/App.js" ]; then
    echo "Creating App.js"
    echo "import React from 'react';\n\nconst App = () => <div>App Component</div>;\n\nexport default App;" > "./src/App.js"
fi

if [ ! -f "./src/index.js" ]; then
    echo "Creating index.js"
    echo "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App';\n\nReactDOM.render(<App />, document.getElementById('root'));" > "./src/index.js"
fi

if [ ! -f "./src/App.css" ]; then
    echo "Creating App.css"
    echo "/* App styles */\n.App {\n  text-align: center;\n}" > "./src/App.css"
fi

echo "Structure created successfully!"
