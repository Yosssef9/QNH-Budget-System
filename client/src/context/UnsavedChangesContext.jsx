import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const navigate = useNavigate();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);

  function safeNavigate(path) {
    if (hasUnsavedChanges) {
      setPendingPath(path);
      return;
    }

    navigate(path);
  }

  function confirmLeave() {
    const path = pendingPath;
    setPendingPath(null);
    setHasUnsavedChanges(false);

    if (path) {
      navigate(path);
    }
  }

  function cancelLeave() {
    setPendingPath(null);
  }

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        safeNavigate,
      }}
    >
      {children}

      <ConfirmModal
        open={pendingPath !== null}
        danger
        title="Leave this page?"
        message="You have unsaved budget items. If you leave this page, your draft is still saved locally, but it is not saved to the database yet."
        confirmText="Leave page"
        cancelText="Stay here"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  return useContext(UnsavedChangesContext);
}
