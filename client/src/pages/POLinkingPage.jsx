import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";

import Breadcrumbs from "../components/Breadcrumbs";

import MyPOLinkRequests from "../components/po/MyPOLinkRequests";
import POLinkDetailsDrawer from "../components/po/POLinkDetailsDrawer";
import POLinkForm from "../components/po/POLinkForm";
import POSummaryCards from "../components/po/POSummaryCards";

import {
  CATEGORY_PO_LINKS_QUERY_KEY,
  useAvailableCategoryPOs,
  useMyCategoryPoLinks,
} from "../hooks/category-po-links/useCategoryPoLinks";

export default function POLinkingPage() {
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [formVersion, setFormVersion] = useState(0);

  const { data: availablePOs = [], isFetching: fetchingPOs } =
    useAvailableCategoryPOs();

  const { data: myPOLinks = [] } = useMyCategoryPoLinks({ status: "ALL" });

  function handleSubmitted() {
    queryClient.invalidateQueries({
      queryKey: CATEGORY_PO_LINKS_QUERY_KEY,
    });

    setFormTemplate(null);
  }

  function handleViewRequest(request) {
    setSelectedRequest(request);
  }

  function handleCloseDetails() {
    setSelectedRequest(null);
  }

  function handleCreateFromRejected(request) {
    setFormTemplate(request);
    setFormVersion((prev) => prev + 1);
    setSelectedRequest(null);

    window.requestAnimationFrame(() => {
      document
        .getElementById("po-link-form-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: "Dashboard",
            path: "/",
          },
          {
            label: "PO Linking",
          },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold"> PO Linking</h1>
        <p className="text-slate-500 mt-2">
          Link purchase orders to approved sub-item lines.
        </p>
      </div>
      <POSummaryCards availablePOs={availablePOs} myLinks={myPOLinks} />

      <section id="po-link-form-section">
        <POLinkForm
          key={formVersion}
          initialRequest={formTemplate}
          onSubmitted={handleSubmitted}
        />
      </section>

      <MyPOLinkRequests
        requests={myPOLinks}
        onView={handleViewRequest}
        onCreateFromRejected={handleCreateFromRejected}
      />

      <POLinkDetailsDrawer
        open={Boolean(selectedRequest)}
        requestId={selectedRequest?.id}
        onClose={handleCloseDetails}
        onCreateFromRejected={handleCreateFromRejected}
      />
    </div>
  );
}
