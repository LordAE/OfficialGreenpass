import React from "react";
import Layout from "@/pages/Layout";
import ChatWidget from "../chat/ChatWidget";

export default function LayoutWithChat({ children, currentPageName }) {
  return (
    <>
      <Layout currentPageName={currentPageName}>
        {children}
      </Layout>
      <ChatWidget />
    </>
  );
}