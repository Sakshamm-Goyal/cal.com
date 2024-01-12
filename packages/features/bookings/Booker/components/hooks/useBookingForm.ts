import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { EventLocationType } from "@calcom/app-store/locations";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import type { useEventReturnType } from "@calcom/features/bookings/Booker/utils/event";
import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { useInitialFormValues } from "./useInitialFormValues";

export interface IUseBookingForm {
  event: useEventReturnType;
}

export type useBookingFormReturnType = ReturnType<typeof useBookingForm>;

export const useBookingForm = ({ event }: IUseBookingForm) => {
  const rescheduleUid = useBookerStore((state) => state.rescheduleUid);
  const bookingData = useBookerStore((state) => state.bookingData);
  const { t } = useLocale();
  const bookerFormErrorRef = useRef<HTMLDivElement>(null);

  const bookingFormSchema = z
    .object({
      responses: event?.data
        ? getBookingResponsesSchema({
            eventType: event?.data,
            view: rescheduleUid ? "reschedule" : "booking",
          })
        : // Fallback until event is loaded.
          z.object({}),
    })
    .passthrough();

  type BookingFormValues = {
    locationType?: EventLocationType["type"];
    responses: z.infer<typeof bookingFormSchema>["responses"] | null;
    // Key is not really part of form values, but only used to have a key
    // to set generic error messages on. Needed until RHF has implemented root error keys.
    globalError: undefined;
  };
  const isRescheduling = !!rescheduleUid && !!bookingData;

  const { initialValues, key } = useInitialFormValues({
    eventType: event.data,
    rescheduleUid,
    isRescheduling,
  });

  const bookingForm = useForm<BookingFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(
      // Since this isn't set to strict we only validate the fields in the schema
      bookingFormSchema,
      {},
      {
        // bookingFormSchema is an async schema, so inform RHF to do async validation.
        mode: "async",
      }
    ),
  });
  const email = bookingForm.watch("responses.email");
  const name = bookingForm.watch("responses.name");

  const beforeVerifyEmail = () => {
    bookingForm.clearErrors();

    // It shouldn't be possible that this method is fired without having event data,
    // but since in theory (looking at the types) it is possible, we still handle that case.
    if (!event?.data) {
      bookingForm.setError("globalError", { message: t("error_booking_event") });
      return;
    }
  };

  const errors = {
    hasFormErrors: Boolean(bookingForm.formState.errors["globalError"]),
    formErrors: bookingForm.formState.errors["globalError"],
  };

  return {
    bookingForm,
    bookerFormErrorRef,
    key,
    formEmail: email,
    formName: name,
    beforeVerifyEmail,
    formErrors: errors,
    errors,
  };
};
