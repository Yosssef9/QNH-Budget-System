export function scrollToBudgetItemRow(budgetItemId) {
  const element = document.getElementById(`budget-item-row-${budgetItemId}`);

  if (!element) return false;

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });

  element.classList.remove("budget-item-row-temp-highlight");

  requestAnimationFrame(() => {
    element.classList.add("budget-item-row-temp-highlight");
  });

  setTimeout(() => {
    element.classList.remove("budget-item-row-temp-highlight");
  }, 2000);

  return true;
}
