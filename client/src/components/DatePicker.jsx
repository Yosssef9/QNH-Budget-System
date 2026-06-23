import dayjs from "dayjs";
import { LocalizationProvider, DesktopDatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  maxDate,
}) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DesktopDatePicker
        value={value ? dayjs(value) : null}
        onChange={(newValue) => {
          onChange({
            target: {
              value: newValue ? newValue.format("YYYY-MM-01") : "",
            },
          });
        }}
        format="DD MMM YYYY"
        views={["year", "month", "day"]}
        openTo="year"
        yearsOrder="desc"
        yearsPerRow={4}
        minDate={minDate ? dayjs(minDate) : undefined}
        maxDate={maxDate ? dayjs(maxDate) : undefined}
        slots={{
          openPickerIcon: undefined,
        }}
        slotProps={{
          field: {
            clearable: true,
          },

          textField: {
            fullWidth: true,
            size: "small",
            placeholder,

            sx: {
              "& .MuiOutlinedInput-root": {
                height: "48px",
                borderRadius: "16px",
                backgroundColor: "#fff",
                fontSize: "14px",
                fontWeight: 500,

                transition: "all 0.2s ease",
              },

              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#e2e8f0",
              },

              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#cbd5e1",
              },

              "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#2563eb",
                borderWidth: "2px",
              },

              "& .MuiInputBase-input": {
                padding: "12px 14px",
              },
            },
          },

          desktopPaper: {
            sx: {
              borderRadius: "24px",
              boxShadow: "0 25px 60px rgba(15,23,42,0.18)",
            },
          },

          popper: {
            placement: "bottom-start",
          },
        }}
      />
    </LocalizationProvider>
  );
}
