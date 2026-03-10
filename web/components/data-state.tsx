type DataStateProps = {
  state: "loading" | "empty" | "error";
  message?: string;
};

export function DataState({ state, message }: DataStateProps) {
  if (state === "loading") {
    return <p className="small">{message ?? "Loading data..."}</p>;
  }

  if (state === "error") {
    return <p className="error">{message ?? "Something went wrong."}</p>;
  }

  return <p className="small">{message ?? "No data found."}</p>;
}
