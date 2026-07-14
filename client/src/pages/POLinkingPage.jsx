import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import Breadcrumbs from "../components/Breadcrumbs";
import LoadingSpinner from "../components/LoadingSpinner";
import LockedPage from "../components/LockedPage";

import MyPOLinkRequests from "../components/po/MyPOLinkRequests";
import POLinkDetailsDrawer from "../components/po/POLinkDetailsDrawer";
import POLinkForm from "../components/po/POLinkForm";
import POSummaryCards from "../components/po/POSummaryCards";

import { useAvailablePOs } from "../hooks/po/useAvailablePOs";
import { usePOBudgetItems } from "../hooks/po/usePOBudgetItems";
import { useMyPOLinks } from "../hooks/po/useMyPOLinks";

import { PO_QUERY_KEY } from "../hooks/po/usePOQueryKeys";

export default function POLinkingPage() {
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [formVersion, setFormVersion] = useState(0);

  const { data: availablePOs = [] } = useAvailablePOs();
  const {
    data: packageSubItems = [],
    isLoading: loadingPackageSubItems,
  } = usePOBudgetItems();

  const { data: myPOLinks = [] } = useMyPOLinks();

  function handleSubmitted() {
    queryClient.invalidateQueries({
      queryKey: PO_QUERY_KEY,
    });

    setFormTemplate(null);
  }

  function handleViewRequest(request) {
    const requestId = Number(request?.id);
    if (!Number.isInteger(requestId) || requestId <= 0) return;

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

  if (loadingPackageSubItems) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading PO Linking"
        subtitle="Checking the current category package sub-items."
      />
    );
  }

  if (packageSubItems.length === 0) {
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

        <LockedPage
          title="PO Linking Not Available"
          message="PO linking is available only when the financial year is in PRE_CLOSING and your category package has completed CFO review."
          reasons={[
            "The active workspace must be a Category Manager workspace.",
            "The financial year must be in PRE_CLOSING status.",
            "The assigned category package must be CFO review completed.",
            "At least one active package sub-item must be available for PO linking.",
          ]}
        />

        <MyPOLinkRequests
          requests={myPOLinks}
          onView={handleViewRequest}
          onCreateFromRejected={handleCreateFromRejected}
        />
      </div>
    );
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
          Link purchase orders to approved category package sub-items.
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
