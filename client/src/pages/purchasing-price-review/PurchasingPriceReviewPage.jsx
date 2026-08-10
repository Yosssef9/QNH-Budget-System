import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCheck,
  CircleDollarSign,
  PackageCheck,
  Send,
  ShoppingCart,
} from "lucide-react";
import { PERMISSION_CODES, hasPermission } from "@qnh/permissions";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";
import CurrencyText from "../../components/CurrencyText";
import EnterpriseSearch from "../../components/EnterpriseSearch";
import LoadingSpinner from "../../components/LoadingSpinner";
import SearchableMultiSelect from "../../components/SearchableMultiSelect";
import CollapsiblePanelToggle from "../../components/layout/CollapsiblePanelToggle";
import PackageSubItemPriceIntelligenceDrawer from "../../components/budgets/price-intelligence/PackageSubItemPriceIntelligenceDrawer";
import PurchasingAttachmentsDrawer from "../../components/purchasing-price-review/PurchasingAttachmentsDrawer";
import PurchasingPackageQueue from "../../components/purchasing-price-review/PurchasingPackageQueue";
import PurchasingPriceHistoryDrawer from "../../components/purchasing-price-review/PurchasingPriceHistoryDrawer";
import PurchasingPriceStatusBadge from "../../components/purchasing-price-review/PurchasingPriceStatusBadge";
import PurchasingPriceTable from "../../components/purchasing-price-review/PurchasingPriceTable";
import {
  useAcceptAllPurchasingPrices,
  useAcceptPurchasingPrice,
  usePurchasingFinancialYears,
  usePurchasingPackage,
  usePurchasingPackages,
  useReopenPurchasingPrice,
  useSavePurchasingPrice,
  useSubmitPurchasingPackage,
} from "../../hooks/purchasing-price-review/usePurchasingPriceReview";
import usePurchasingPriceDrafts from "../../hooks/purchasing-price-review/usePurchasingPriceDrafts";

const PRICE_STATUS_OPTIONS = [
  { value: "ALL", label: "All price statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
];
const CFO_STATUS_OPTIONS = [
  { value: "ALL", label: "All CFO item statuses" },
  { value: "PENDING_CFO_REVIEW", label: "Pending CFO review" },
  { value: "NEEDS_MODIFICATION", label: "Needs modification" },
  { value: "CFO_ACCEPTED", label: "CFO accepted" },
];

function Metric({ label, value, icon: Icon, tone = "violet", children }) {
  const tones = {
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className="min-w-0 border-r border-slate-200 px-4 py-3 first:pl-0 last:border-r-0">
      <div className="flex items-center gap-2">
        <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon size={17} /></span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <div className="mt-0.5 truncate text-lg font-black text-slate-950">{children || value}</div>
        </div>
      </div>
    </div>
  );
}

export default function PurchasingPriceReviewPage() {
  const { budgetAccess } = useAuth();
  const [financialYearId, setFinancialYearId] = useState(null);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [queueSearch, setQueueSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [priceStatus, setPriceStatus] = useState("ALL");
  const [genericItemId, setGenericItemId] = useState("ALL");
  const [cfoStatus, setCfoStatus] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachmentItem, setAttachmentItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  const [intelligenceItem, setIntelligenceItem] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [priceSaveStates, setPriceSaveStates] = useState({});

  const financialYearsQuery = usePurchasingFinancialYears();
  const packagesQuery = usePurchasingPackages(financialYearId, "ALL");
  const packageQuery = usePurchasingPackage(selectedPackageId);
  const savePriceMutation = useSavePurchasingPrice();
  const acceptMutation = useAcceptPurchasingPrice();
  const reopenMutation = useReopenPurchasingPrice();
  const acceptAllMutation = useAcceptAllPurchasingPrices();
  const submitMutation = useSubmitPurchasingPackage();
  const drafts = usePurchasingPriceDrafts(packageQuery.data);

  const canReview = hasPermission(
    budgetAccess,
    PERMISSION_CODES.REVIEW_CATEGORY_PACKAGE_PRICES,
  );
  const canManageAttachments = hasPermission(
    budgetAccess,
    PERMISSION_CODES.MANAGE_PURCHASING_SUPPORTING_DOCUMENTS,
  );
  const canSubmit = hasPermission(
    budgetAccess,
    PERMISSION_CODES.SUBMIT_PRICED_CATEGORY_PACKAGES_TO_CFO,
  );

  useEffect(() => {
    if (financialYearId || !financialYearsQuery.data?.length) return;
    const preferred =
      financialYearsQuery.data.find((year) => year.status === "OPEN") ||
      financialYearsQuery.data[0];
    setFinancialYearId(preferred.id);
  }, [financialYearId, financialYearsQuery.data]);

  useEffect(() => {
    const packages = packagesQuery.data || [];
    if (!packages.length) {
      setSelectedPackageId(null);
      return;
    }
    if (!packages.some((pkg) => Number(pkg.id) === Number(selectedPackageId))) {
      setSelectedPackageId(packages[0].id);
    }
  }, [packagesQuery.data, selectedPackageId]);

  useEffect(() => {
    setPriceSaveStates({});
  }, [selectedPackageId]);

  const packageData = packageQuery.data;
  const editable =
    packageData?.package?.status === "IN_PURCHASING_REVIEW" && canReview;
  const busy =
    acceptMutation.isPending ||
    reopenMutation.isPending ||
    acceptAllMutation.isPending ||
    submitMutation.isPending;

  const filteredPackages = useMemo(() => {
    const search = queueSearch.trim().toLowerCase();
    return (packagesQuery.data || []).filter((pkg) =>
      !search
        ? true
        : `${pkg.category_name} ${pkg.category_code}`.toLowerCase().includes(search),
    );
  }, [packagesQuery.data, queueSearch]);

  const genericOptions = useMemo(() => {
    const map = new Map();
    drafts.rows.forEach((row) => map.set(row.generic_item_id, {
      value: row.generic_item_id,
      label: row.generic_item_name,
    }));
    return [{ value: "ALL", label: "All generic items" }, ...map.values()];
  }, [drafts.rows]);

  const filteredRows = useMemo(() => {
    const search = tableSearch.trim().toLowerCase();
    return drafts.rows.filter((row) => {
      if (priceStatus !== "ALL" && row.price_review_status !== priceStatus) return false;
      if (cfoStatus !== "ALL" && row.cfo_review_status !== cfoStatus) return false;
      if (genericItemId !== "ALL" && Number(row.generic_item_id) !== Number(genericItemId)) return false;
      if (!search) return true;
      return `${row.generic_item_name} ${row.generic_item_code} ${row.name} ${row.sub_item_code}`
        .toLowerCase()
        .includes(search);
    });
  }, [cfoStatus, drafts.rows, genericItemId, priceStatus, tableSearch]);

  const currentTotal = drafts.rows.reduce(
    (sum, row) =>
      sum + Number(row.quantity || 0) * Number(row.draft_purchasing_unit_price || 0),
    0,
  );
  const pendingCount = drafts.rows.filter((row) => row.price_review_status === "PENDING").length;
  const acceptedCount = drafts.rows.filter((row) => row.price_review_status === "ACCEPTED").length;
  const submissionTotal =
    packageData?.summary?.estimated_total ?? currentTotal;

  function showError(error, fallback) {
    toast.error(error?.response?.data?.message || fallback);
  }

  async function savePrice(row) {
    if (!row.is_dirty || priceSaveStates[row.id]?.status === "saving") return;

    const price = Number(row.draft_purchasing_unit_price);
    if (!Number.isFinite(price) || price < 1) return;

    setPriceSaveStates((current) => ({
      ...current,
      [row.id]: { status: "saving" },
    }));

    try {
      await savePriceMutation.mutateAsync({
        packageId: packageData.package.id,
        packageSubItemId: row.id,
        payload: {
          purchasing_unit_price: price,
          row_version: row.row_version,
        },
      });
      setPriceSaveStates((current) => ({
        ...current,
        [row.id]: { status: "saved" },
      }));
    } catch (error) {
      setPriceSaveStates((current) => ({
        ...current,
        [row.id]: { status: "error" },
      }));
      showError(error, `Failed to save the Purchasing price for ${row.name}`);
    }
  }

  async function acceptPrice(row) {
    try {
      await acceptMutation.mutateAsync({
        packageId: packageData.package.id,
        packageSubItemId: row.id,
        payload: { row_version: row.row_version },
      });
      toast.success(`${row.name} price accepted`);
    } catch (error) {
      showError(error, "Failed to accept Purchasing price");
    }
  }

  async function reopenPrice(row) {
    try {
      await reopenMutation.mutateAsync({
        packageId: packageData.package.id,
        packageSubItemId: row.id,
        payload: { row_version: row.row_version },
      });
      toast.success(`${row.name} price reopened for editing`);
    } catch (error) {
      showError(error, "Failed to reopen Purchasing price");
    }
  }

  function selectPackage(packageId) {
    if (drafts.dirtyRows.length) {
      toast.error("Save or discard price changes before switching category packages");
      return;
    }
    setSelectedPackageId(packageId);
  }

  const years = financialYearsQuery.data || [];
  const selectedGenericRows = intelligenceItem
    ? drafts.rows.filter((row) => row.generic_item_id === intelligenceItem.generic_item_id)
    : [];

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-700 p-3 text-white"><ShoppingCart size={22} /></div>
            <div>
              <p className="text-xs font-black uppercase text-violet-600">Hospital package pricing</p>
              <h1 className="text-2xl font-black text-slate-950">Purchasing Price Review</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SearchableMultiSelect
              multiple={false}
              disableClear
              value={financialYearId || ""}
              options={years.map((year) => ({ value: year.id, label: `FY ${year.year} | ${year.status}` }))}
              onChange={(event) => {
                if (drafts.dirtyRows.length) {
                  toast.error("Save or discard price changes before changing the financial year");
                  return;
                }
                setFinancialYearId(event.target.value);
                setSelectedPackageId(null);
              }}
              placeholder="Select financial year"
            />
            <CollapsiblePanelToggle
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen((value) => !value)}
              openLabel="Show Categories"
              closeLabel="Hide Categories"
            />
          </div>
        </div>
      </header>

      <div
        className={`grid min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-in-out ${
          sidebarOpen
            ? "grid-cols-[minmax(240px,42vw)_minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)]"
            : "grid-cols-[0px_minmax(0,1fr)]"
        }`}
      >
        <div
          aria-hidden={!sidebarOpen}
          className={`min-w-0 overflow-hidden transition-[opacity,transform] duration-300 ease-in-out ${
            sidebarOpen
              ? "translate-x-0 opacity-100"
              : "pointer-events-none -translate-x-4 opacity-0"
          }`}
        >
          <PurchasingPackageQueue
            packages={filteredPackages}
            selectedPackageId={selectedPackageId}
            search={queueSearch}
            onSearchChange={setQueueSearch}
            onSelect={selectPackage}
          />
        </div>

        <main className="min-w-0 p-5">
          {packageQuery.isLoading || financialYearsQuery.isLoading ? (
            <LoadingSpinner fill />
          ) : financialYearsQuery.isError || packagesQuery.isError || packageQuery.isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-800">
              <div className="flex items-center gap-2 font-black">
                <AlertCircle size={19} />
                Purchasing price review could not be loaded
              </div>
              <p className="mt-2 text-sm font-semibold">
                {packageQuery.error?.response?.data?.message ||
                  packagesQuery.error?.response?.data?.message ||
                  financialYearsQuery.error?.response?.data?.message ||
                  "Refresh the page and try again."}
              </p>
            </div>
          ) : !packageData ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
              <PackageCheck className="mx-auto text-slate-400" size={36} />
              <h2 className="mt-3 text-lg font-black text-slate-900">No category package selected</h2>
              <p className="mt-1 text-sm text-slate-500">Select a submitted package from the category queue.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-slate-950">{packageData.package.category_name}</h2>
                      <PurchasingPriceStatusBadge status={packageData.package.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">FY {packageData.package.financial_year} | Purchasing round {packageData.package.purchasing_review_round}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setConfirmAction("ACCEPT_ALL")} disabled={!editable || drafts.dirtyRows.length > 0 || pendingCount === 0 || busy} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck size={17} />Accept All Valid</button>
                    <button type="button" onClick={() => setConfirmAction("SUBMIT")} disabled={!canSubmit || !editable || drafts.dirtyRows.length > 0 || pendingCount > 0 || busy} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 font-black text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-40"><Send size={17} />Submit to CFO</button>
                  </div>
                </div>
                <div className="grid divide-y divide-slate-200 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                  <Metric label="Package value" icon={CircleDollarSign}><CurrencyText value={currentTotal} compact /></Metric>
                  <Metric label="Package models" value={drafts.rows.length} icon={PackageCheck} tone="blue" />
                  <Metric label="Accepted prices" value={acceptedCount} icon={CheckCheck} tone="emerald" />
                  <Metric label="Pending prices" value={pendingCount} icon={AlertCircle} tone="amber" />
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_240px_200px_220px]">
                  <EnterpriseSearch value={tableSearch} onChange={setTableSearch} placeholder="Search generic items or models" />
                  <SearchableMultiSelect multiple={false} disableClear value={genericItemId} options={genericOptions} onChange={(event) => setGenericItemId(event.target.value)} />
                  <SearchableMultiSelect multiple={false} disableClear value={priceStatus} options={PRICE_STATUS_OPTIONS} onChange={(event) => setPriceStatus(event.target.value)} />
                  <SearchableMultiSelect multiple={false} disableClear value={cfoStatus} options={CFO_STATUS_OPTIONS} onChange={(event) => setCfoStatus(event.target.value)} />
                </div>
              </section>

              <PurchasingPriceTable
                rows={filteredRows}
                editable={editable}
                busy={busy}
                onPriceChange={(row, value) => {
                  setPriceSaveStates((current) => {
                    if (!current[row.id]) return current;
                    const next = { ...current };
                    delete next[row.id];
                    return next;
                  });
                  drafts.updateDraft(row, value);
                }}
                onPriceBlur={savePrice}
                priceSaveStates={priceSaveStates}
                onAccept={acceptPrice}
                onReopen={reopenPrice}
                onOpenAttachments={setAttachmentItem}
                onOpenHistory={setHistoryItem}
                onOpenPriceIntelligence={setIntelligenceItem}
              />
            </div>
          )}
        </main>

      </div>

      <PurchasingAttachmentsDrawer open={Boolean(attachmentItem)} onClose={() => setAttachmentItem(null)} packageId={packageData?.package?.id} subItem={attachmentItem} editable={editable && canManageAttachments && attachmentItem?.cfo_review_status !== "CFO_ACCEPTED"} />
      <PurchasingPriceHistoryDrawer open={Boolean(historyItem)} onClose={() => setHistoryItem(null)} packageId={packageData?.package?.id} subItem={historyItem} />
      <PackageSubItemPriceIntelligenceDrawer open={Boolean(intelligenceItem)} subItem={intelligenceItem} subItems={selectedGenericRows} onSelectSubItem={setIntelligenceItem} onClose={() => setIntelligenceItem(null)} />

      <ConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction === "SUBMIT" ? `Submit ${packageData?.package?.category_name || "Category"} Package to CFO?` : "Accept all valid prices?"}
        message={confirmAction === "SUBMIT" ? "The accepted Purchasing prices will become the effective package prices, and the package will be locked for CFO review." : `Accept all ${pendingCount} pending prices in this package?`}
        confirmText={confirmAction === "SUBMIT" ? "Submit to CFO" : "Accept All"}
        loading={acceptAllMutation.isPending || submitMutation.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          try {
            if (confirmAction === "SUBMIT") {
              await submitMutation.mutateAsync({ packageId: packageData.package.id, payload: { row_version: packageData.package.row_version } });
              toast.success("Priced category package submitted to CFO");
            } else {
              await acceptAllMutation.mutateAsync({ packageId: packageData.package.id, payload: { row_version: packageData.package.row_version } });
              toast.success("All valid Purchasing prices accepted");
            }
            setConfirmAction(null);
          } catch (error) {
            showError(error, confirmAction === "SUBMIT" ? "Failed to submit package to CFO" : "Failed to accept prices");
          }
        }}
      >
        {confirmAction === "SUBMIT" ? (
          <div className="overflow-hidden rounded-lg border border-violet-200 bg-violet-50">
            <div className="grid grid-cols-3 divide-x divide-violet-200 border-b border-violet-200">
              <div className="px-4 py-3">
                <p className="text-xs font-black uppercase text-violet-600">Financial Year</p>
                <p className="mt-1 font-black text-slate-950">
                  FY {packageData?.package?.financial_year}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-black uppercase text-violet-600">Models</p>
                <p className="mt-1 font-black text-slate-950">
                  {packageData?.summary?.price_count ?? drafts.rows.length}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs font-black uppercase text-violet-600">Accepted</p>
                <p className="mt-1 font-black text-slate-950">
                  {packageData?.summary?.accepted_price_count ?? acceptedCount} /{" "}
                  {packageData?.summary?.price_count ?? drafts.rows.length}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4">
              <div>
                <p className="text-xs font-black uppercase text-violet-600">Final Package Value</p>
                <div className="mt-1 text-2xl font-black text-slate-950">
                  <CurrencyText value={submissionTotal} />
                </div>
              </div>
              <CircleDollarSign className="shrink-0 text-violet-600" size={28} />
            </div>
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  );
}
