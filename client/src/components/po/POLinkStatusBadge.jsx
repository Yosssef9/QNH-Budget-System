import {
  getPOLinkStatusLabel,
  getPOLinkStatusStyle,
} from "../../theme/statusStyles";

export default function POLinkStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        getPOLinkStatusStyle(status).badge
      }`}
    >
      {getPOLinkStatusLabel(status)}
    </span>
  );
}
