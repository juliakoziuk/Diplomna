import React from "react"
import ReactDOM from "react-dom/client"

import "./index.css"
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom"

import { MantineProvider } from "@mantine/core"
import { ModalsProvider } from "@mantine/modals"
import VerifiableSearchDemo from "./pages/VerifiableSearchDemo.tsx"
import Pricing from "./pages/Pricing.tsx"
import Account from "./pages/Account.tsx"
import Product from "./pages/Product.tsx"

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
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <ModalsProvider>
        <RouterProvider router={router} />
      </ModalsProvider>
    </MantineProvider>
  </React.StrictMode>
)
