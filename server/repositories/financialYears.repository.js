// Temporary compatibility adapter for unmigrated legacy modules that still read
// the active financial year. Financial Years lifecycle ownership is now in
// server/modules/financial-years and this file must be removed as those modules
// migrate to the new architecture.
export {
  findLatestFinancialYearRepo,
  findOpenFinancialYearRepo,
} from "../modules/financial-years/financialYears.repository.js";

export {
  findFinancialYearByIdRepo as findFinancialYearById,
} from "../modules/financial-years/financialYears.repository.js";
