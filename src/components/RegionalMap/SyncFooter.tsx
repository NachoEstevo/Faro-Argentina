import { ChevronRight, ShieldCheck } from "lucide-react";
import styles from "./RegionalMap.module.css";

interface Props {
  label: string;
}

export default function SyncFooter({ label }: Props) {
  return (
    <div className={styles.syncFooter}>
      <ShieldCheck size={12} aria-hidden className={styles.syncIcon} />
      <span className={styles.syncLabel}>{label}</span>
      <ChevronRight size={11} aria-hidden className={styles.syncChevron} />
    </div>
  );
}
