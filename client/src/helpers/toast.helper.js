import toast from "react-hot-toast";

/**
 * Extract API error message safely
 */
export function getErrorMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

/**
 * Promise-based toast handler
 */
export function toastPromise(promise, messages) {
  const id = toast.loading(messages.loading || "Loading...");

  return promise
    .then((res) => {
      toast.success(messages.success || "Success", { id });
      return res;
    })
    .catch((err) => {
      toast.error(getErrorMessage(err, messages.error), { id });
      throw err;
    });
}
