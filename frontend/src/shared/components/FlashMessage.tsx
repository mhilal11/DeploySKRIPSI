import { useEffect } from "react";
import Swal from "sweetalert2";

import { usePage } from "@/shared/lib/inertia";
import { PageProps } from "@/shared/types/global"; // path sesuai alias kamu

export default function FlashMessage() {
  const page = usePage<PageProps>();
  const success = page.props.flash?.success;
  const error = page.props.flash?.error;

  useEffect(() => {
    if (success) {
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: success,
        confirmButtonColor: "#3085d6",
      });
    }

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error,
        confirmButtonColor: "#d33",
      });
    }
  }, [success, error]);

  return null;
}



