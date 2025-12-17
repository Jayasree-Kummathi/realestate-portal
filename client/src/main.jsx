import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";

/* -------- Main Pages -------- */
import Home from "./pages/Home";
import PropertyForm from "./pages/PropertyForm";
import EditProperty from "./pages/EditProperty";
import ViewProperties from "./pages/ViewProperties";
import ViewEnquiries from "./pages/ViewEnquiries";
import PropertyDetails from "./pages/PropertyDetails";

/* -------- Agent -------- */
import AgentLogin from "./pages/AgentLogin";
import AgentForgotPassword from "./pages/AgentForgotPassword";
import AgentRegister from "./pages/AgentRegister";
import AgentDashboard from "./pages/AgentDashboard";
import AgentDetails from "./pages/AgentDetails";

/* -------- Admin -------- */
import AdminLogin from "./pages/AdminLogin";
import AgentResetPassword from "./pages/AgentResetPassword";

import AdminDashboard from "./pages/AdminDashboard";
import ManageAgents from "./pages/ManageAgents";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";

/* -------- ⭐ SERVICE PROVIDER ⭐ -------- */
import ServiceProviderLogin from "./pages/ServiceProviderLogin";
import ServiceProviderRegister from "./pages/ServiceProviderRegister";
import ServiceProviderDashboard from "./pages/ServiceProviderDashboard";
import ServiceForm from "./pages/ServiceForm";
import EditService from "./pages/EditService";
import MyServices from "./pages/MyServices";
import ServiceHome from "./pages/ServiceHome";
import ServiceProviderEnquiries from "./pages/ServiceProviderEnquiries";
import ServiceDetails from "./pages/ServiceDetails";
import ServiceProviderDetails from "./pages/ServiceProviderDetails";
import ServiceProviderResetPassword from "./pages/ServiceProviderResetPassword"

import MarketingExecutiveRegister from "./pages/MarketingExecutiveRegister";
import MarketingExecutiveLogin from "./pages/MarketingExecutiveLogin";
import MEForgotPassword from "./pages/MEForgotPassword";
import MarketingExecutiveDashboard from "./pages/MarketingExecutiveDashboard";
import MEReferredAgents from "./pages/MEReferredAgents";
import MarketingExecutiveReferralList from "./pages/MarketingExecutiveReferralProviders";
import MarketingResetPassword from "./pages/MarketingResetPassword";

/* -------- Admin manages providers -------- */
import AdminServiceProviders from "./pages/AdminServiceProviders";

import Layout from "./components/Layout";

import Legal from "./pages/Legal";

import PaymentSuccess from "./pages/PaymentSuccess";



ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
       {/* Layout wraps all pages */}
        <Route element={<Layout />}>
        
        {/* PUBLIC ROUTES */}
        <Route index element={<Home />} />
        <Route path="service/:id" element={<ServiceDetails />} />

        {/* -------- AGENT AUTH -------- */}
        <Route path="agent-login" element={<AgentLogin />} />
        <Route path="agent-register" element={<AgentRegister />} />
        <Route path="/agent-reset-password/:token"element={<AgentResetPassword />}/>

        {/* -------- AGENT PAGES -------- */}
        <Route path="agent-dashboard" element={<AgentDashboard />} />
        <Route path="agent/:id" element={<AgentDetails />} />
        <Route path="view-enquiries" element={<ViewEnquiries />} />
        <Route path="property-form" element={<PropertyForm />} />
        <Route path="edit-property/:id" element={<EditProperty />} />
        <Route path="property/:id" element={<PropertyDetails />} />
        <Route path="view-properties" element={<ViewProperties />} />

        {/* -------- ADMIN AUTH -------- */}
        <Route path="admin-login" element={<AdminLogin />} />
        <Route
          path="/agent-forgot-password"
          element={<AgentForgotPassword />}
        />

        {/* -------- ADMIN PAGES -------- */}
        <Route path="admin-dashboard" element={<AdminDashboard />} />
        <Route path="admin-manage-agents" element={<ManageAgents />} />
        <Route path="admin-service-providers" element={<AdminServiceProviders />} />
        <Route path="admin-enquiries" element={<ViewEnquiries />} />
        <Route path="analytics" element={<AnalyticsDashboard />} />

        {/* -------- SERVICE PROVIDER AUTH -------- */}
        <Route path="service-provider-login" element={<ServiceProviderLogin />} />
        <Route path="service-provider-register" element={<ServiceProviderRegister />} />

        {/* -------- SERVICE PROVIDER DASHBOARD -------- */}
        <Route path="service-provider-dashboard" element={<ServiceProviderDashboard />} />

        {/* -------- SERVICE PROVIDER WORKFLOW -------- */}
        <Route path="service-home" element={<ServiceHome />} />
        <Route path="service-upload" element={<ServiceForm />} />
        <Route path="service-my-services" element={<MyServices />} />
        <Route path="service/edit/:id" element={<EditService />} />

        {/* -------- SERVICE PROVIDER STATIC ROUTES -------- */}
        <Route path="service-provider-enquiries" element={<ServiceProviderEnquiries />} />

        {/* ⚠️ DYNAMIC ROUTE MUST BE LAST */}
        <Route path="service-provider/:id" element={<ServiceProviderDetails />} />
        <Route
  path="/service-reset-password/:token"
  element={<ServiceProviderResetPassword />}
/>


        {/* -------- MARKETING EXECUTIVE -------- */}
        <Route path="marketing-executive/register" element={<MarketingExecutiveRegister />} />
        <Route path="marketing-executive/login" element={<MarketingExecutiveLogin />} />
        <Route path="/marketing-executive/forgot-password" element={<MEForgotPassword />}/>
        <Route path="marketing-executive/dashboard" element={<MarketingExecutiveDashboard />} />
        <Route path="marketing-executive/referrals" element={<MEReferredAgents />} />
        <Route path="marketing-executive/referrals/service-providers" element={<MarketingExecutiveReferralList />} />
        <Route path="/marketing-reset-password/:token" element={<MarketingResetPassword />}/>


        {/* -------- LEGAL / COMPLIANCE -------- */}
<Route path="legal" element={<Legal />} />
<Route path="terms" element={<Legal />} />
<Route path="terms-and-conditions" element={<Legal />} />
<Route path="privacy" element={<Legal />} />
<Route path="privacy-policy" element={<Legal />} />
<Route path="refund" element={<Legal />} />
<Route path="refund-policy" element={<Legal />} />
<Route path="about" element={<Legal />} />
<Route path="about-us" element={<Legal />} />
<Route path="contact" element={<Legal />} />
<Route path="contact-us" element={<Legal />} />


{/* -------- PAYMENT SUCCESS -------- */}
  <Route
    path="agent-payment-success"
    element={<PaymentSuccess />}
  />
<Route path="provider-payment-success" element={<PaymentSuccess />} />
</Route>
      </Route>
    </Routes>
  </BrowserRouter>
);


