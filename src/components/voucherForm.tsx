import { Toast } from './toast';
import React, { useState } from "react";
import { Text } from "react-native";
import { Voucher } from "../contracts/domain";
import { voucherService } from "../services/voucherService";
import { Button, Choice, Field, ui } from "./ui";
export function VoucherForm({
  voucher,
  onSaved,
}: {
  voucher: Voucher;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: voucher.name,
    value: String(voucher.discountValue),
    minimum: String(voucher.minOrderValue),
    maximum:
      voucher.maxDiscountAmount === undefined
        ? ""
        : String(voucher.maxDiscountAmount),
    start: voucher.startDate,
    end: voucher.endDate,
    type: voucher.discountType,
  });
  const [error, setError] = useState("");
  const labels = {
    name: "Tên ưu đãi",
    value: "Mức giảm",
    minimum: "Giá trị đơn tối thiểu",
    maximum: "Giảm tối đa (không bắt buộc)",
    start: "Ngày bắt đầu (YYYY-MM-DD)",
    end: "Ngày kết thúc (YYYY-MM-DD)",
  };
  return (
    <>
      <Choice
        label="Loại ưu đãi"
        value={form.type}
        onChange={(type) =>
          setForm({ ...form, type: type as "fixed" | "percentage" })
        }
        options={[
          { label: "Phần trăm", value: "percentage" },
          { label: "Số tiền", value: "fixed" },
        ]}
      />
      {Object.entries(labels).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={form[key as keyof typeof form]}
          onChange={(v) => setForm({ ...form, [key]: v })}
        />
      ))}
      <Toast message={error} onClose={() => setError('')} />
      <Button
        primary
        onPress={() => {
          if (
            ![
              form.value,
              form.minimum,
              ...(form.maximum ? [form.maximum] : []),
            ].every(
              (v) => v.trim() && Number.isFinite(Number(v)) && Number(v) >= 0,
            ) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(form.start) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(form.end) ||
            !Number.isFinite(Date.parse(form.start)) ||
            !Number.isFinite(Date.parse(form.end))
          ) {
            setError("Kiểm tra mức giảm, giới hạn và ngày hiệu lực.");
            return;
          }
          const result = voucherService.updateVoucher({
            voucherId: voucher.id,
            name: form.name,
            discountType: form.type,
            discountValue: Number(form.value),
            minOrderValue: Number(form.minimum),
            maxDiscountAmount: form.maximum ? Number(form.maximum) : undefined,
            startDate: form.start,
            endDate: form.end,
            currentActorRole: "admin",
          });
          if (!result.success) setError(result.error || "Không thể lưu.");
          else onSaved();
        }}
      >
        Lưu ưu đãi
      </Button>
    </>
  );
}
