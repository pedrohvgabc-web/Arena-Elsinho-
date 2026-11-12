import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, CalendarDays, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getPublicReleasedSlotOffers } from "@/lib/arena.functions";
import { ARENA_TZ } from "@/lib/arena-rules";

type Offer = {
  id: string;
  unitId: "unidade-1" | "unidade-2";
  spaceId: string;
  spaceName: string;
  date: string;
  slots: Array<{ start: string; end: string }>;
  expiresAt: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: ARENA_TZ,
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatTimes(slots: Offer["slots"]) {
  const ranges: Array<[string, string]> = [];
  for (const slot of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const start = slot.start.slice(0, 5);
    const end = slot.end.slice(0, 5);
    const previous = ranges.at(-1);
    if (previous && previous[1] === start) previous[1] = end;
    else ranges.push([start, end]);
  }
  return ranges.map(([start, end]) => `${start}–${end === "24:00" ? "00:00" : end}`).join(" · ");
}

export function ReleasedSlotsNotice() {
  const fetchOffers = useServerFn(getPublicReleasedSlotOffers);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const offersQuery = useQuery({
    queryKey: ["public-released-slot-offers"],
    queryFn: () => fetchOffers(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const offers = useMemo(
    () =>
      (offersQuery.data ?? []).filter(
        (offer) => Date.parse(offer.expiresAt) > Date.now(),
      ) as Offer[],
    [offersQuery.data],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && offers.length && !dialog.open) dialog.showModal();
    if ((!open || !offers.length) && dialog.open) dialog.close();
    if (!offers.length) setOpen(false);
  }, [open, offers.length]);

  if (!offers.length) return null;

  return (
    <>
      <button
        type="button"
        className="released-slots-fab"
        aria-label={`${offers.length} ${offers.length === 1 ? "horário liberado" : "horários liberados"} para reserva`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <BellRing size={24} aria-hidden="true" />
        <span className="released-slots-fab__count" aria-hidden="true">
          {offers.length > 9 ? "9+" : offers.length}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className="released-slots-dialog"
        aria-labelledby="released-slots-title"
        aria-describedby="released-slots-description"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="released-slots-dialog__head">
          <div>
            <span className="mono">VAGA LIBERADA · ARENA LESTE</span>
            <h2 id="released-slots-title">Bora aproveitar?</h2>
          </div>
          <button
            type="button"
            className="released-slots-dialog__close"
            onClick={() => setOpen(false)}
            aria-label="Fechar horários liberados"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <p id="released-slots-description" className="released-slots-dialog__intro">
          Este horário está disponível para reserva. Venha aproveitar!
        </p>
        <div className="released-slots-dialog__list">
          {offers.map((offer) => (
            <article className="released-slots-offer" key={offer.id}>
              <div className="released-slots-offer__label">
                {offer.unitId === "unidade-1"
                  ? "Unidade 1 · Cuniã"
                  : "Unidade 2 · Pinheiro Machado"}
              </div>
              <h3>{offer.spaceName}</h3>
              <p className="released-slots-offer__date">
                <CalendarDays size={15} aria-hidden="true" /> {formatDate(offer.date)}
              </p>
              <p className="released-slots-offer__times">{formatTimes(offer.slots)}</p>
              <Link
                to="/reservar"
                search={{ unit: offer.unitId, offer: offer.id }}
                className="released-slots-offer__action"
                onClick={() => setOpen(false)}
              >
                Reservar este horário <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <p className="released-slots-dialog__foot">
          O aviso sai do ar após a reserva ou em até 12 horas.
        </p>
      </dialog>
    </>
  );
}
