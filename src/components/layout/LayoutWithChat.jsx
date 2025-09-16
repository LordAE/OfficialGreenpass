import React from "react";
import Layout from "../../Layout";
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