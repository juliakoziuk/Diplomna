import React from "react"
import ReactDOM from "react-dom/client"

import "./index.css"
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom"

import ThemeProvider from "./theme/ThemeProvider.tsx"
import { I18nProvider } from "./i18n"
import { ModalsProvider } from "@mantine/modals"
import VerifiableSearchDemo from "./pages/VerifiableSearchDemo.tsx"
import Pricing from "./pages/Pricing.tsx"
import Account from "./pages/Account.tsx"
import Product from "./pages/Product.tsx"
import Technology from "./pages/Technology.tsx"
import Verify from "./pages/Verify.tsx"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/product" replace />,
  },
  {
    path: "/verifiable-search",
    element: <VerifiableSearchDemo />,
  },
  {
    path: "/product",
    element: <Product />,
  },
  {
    path: "/verify",
    element: <Verify />,
  },
  {
    path: "/technology",
    element: <Technology />,
  },
  {
    path: "/pricing",
    element: <Pricing />,
  },
  {
    path: "/account",
    element: <Account />,
  },
])

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ModalsProvider>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </ModalsProvider>
    </ThemeProvider>
  </React.StrictMode>
)
