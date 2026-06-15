import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";

import Breadcrumbs from "../components/Breadcrumbs";
import LoadingSpinner from "../components/LoadingSpinner";
import LockedPage from "../components/LockedPage";

import MyPOLinkRequests from "../components/po/MyPOLinkRequests";
import POLinkDetailsDrawer from "../components/po/POLinkDetailsDrawer";
import POLinkForm from "../components/po/POLinkForm";
import POSummaryCards from "../components/po/POSummaryCards";

import { getMyBudgets } from "../api/budget.api";

import { useAvailablePOs } from "../hooks/po/useAvailablePOs";
import { useMyPOLinks } from "../hooks/po/useMyPOLinks";

import { getPOLinkPageLock } from "../helpers/pageLockRules";
import useLockToast from "../hooks/useLockToast";
import { PO_QUERY_KEY } from "../hooks/po/usePOQueryKeys";

export default function POLinkingPage() {
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formTemplate, setFormTemplate] = useState(null);
  const [formVersion, setFormVersion] = useState(0);

  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ["my-budgets"],
    queryFn: getMyBudgets,
  });

  const {
    data: availablePOs = [],
    isFetching: fetchingPOs,
  } = useAvailablePOs();

  const { data: myPOLinks = [] } = useMyPOLinks();

  const lock = useMemo(() => getPOLinkPageLock(budgets), [budgets]);

  useLockToast(lock.locked && !loadingBudgets, lock.message);

  function handleSubmitted() {
    queryClient.invalidateQueries({
      queryKey: PO_QUERY_KEY,
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

  if (loadingBudgets) {
    return (
      <LoadingSpinner
        fullPage
        title="Loading PO Linking"
        subtitle="Checking current financial year and available budgets."
      />
    );
  }

  if (lock.locked) {
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
          title={lock.title}
          message={lock.message}
          reasons={lock.reasons}
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                <Link2 size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  PO Linking
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Link approved Purchase Order quantities to approved budget
                  items during the pre-closing period.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {fetchingPOs ? "Refreshing PO records..." : "PO records ready"}
          </div>
        </div>
      </section>

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
