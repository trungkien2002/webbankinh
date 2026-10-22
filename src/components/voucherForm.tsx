import { Toast } from './toast';
import React, { useState } from "react";
import { Text, View } from "react-native";
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

  const isExpired = new Date(voucher.endDate + 'T23:59:59') < new Date();

  return (
    <>
      {isExpired && (
        <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 14 }}>
          <Text style={{ color: '#b91c1c', fontWeight: '600', fontSize: 13 }}>
            Voucher này đã hết hạn sử dụng (ngày kết thúc: {voucher.endDate}). Theo quy định, không thể chỉnh sửa nội dung voucher đã hết hạn.
          </Text>
        </View>
      )}

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
      <Field
        label="Tên ưu đãi"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
      />
      <Field
        label={form.type === "percentage" ? "Mức giảm (%)" : "Mức giảm (đ)"}
        value={form.value}
        onChange={(v) => setForm({ ...form, value: v })}
      />
      <Field
        label="Giá trị đơn tối thiểu (đ)"
        value={form.minimum}
        onChange={(v) => setForm({ ...form, minimum: v })}
      />
      {form.type === "percentage" && (
        <Field
          label="Giảm tối đa (đ, không bắt buộc)"
          value={form.maximum}
          onChange={(v) => setForm({ ...form, maximum: v })}
        />
      )}

      {/* Date Pickers chuẩn web YYYY-MM-DD */}
      <View style={{ marginVertical: 8 }}>
        <Text style={ui.label}>Ngày bắt đầu</Text>
        <input
          type="date"
          aria-label="Ngày bắt đầu voucher"
          value={form.start}
          onChange={(e) => setForm({ ...form, start: e.target.value })}
          disabled={isExpired}
          style={{
            width: "100%",
            padding: 11,
            border: "1px solid #cad5c5",
            borderRadius: 8,
            background: isExpired ? "#f3f4f6" : "#fff",
            color: "#284e43",
            fontFamily: "inherit",
            boxSizing: "border-box",
            marginBottom: 10,
          }}
        />
      </View>

      <View style={{ marginVertical: 8 }}>
        <Text style={ui.label}>Ngày kết thúc</Text>
        <input
          type="date"
          aria-label="Ngày kết thúc voucher"
          value={form.end}
          onChange={(e) => setForm({ ...form, end: e.target.value })}
          disabled={isExpired}
          style={{
            width: "100%",
            padding: 11,
            border: "1px solid #cad5c5",
            borderRadius: 8,
            background: isExpired ? "#f3f4f6" : "#fff",
            color: "#284e43",
            fontFamily: "inherit",
            boxSizing: "border-box",
            marginBottom: 10,
          }}
        />
      </View>

      <Toast message={error} onClose={() => setError('')} />
      <Button
        primary
        disabled={isExpired}
        onPress={() => {
          if (isExpired) {
            setError("Không thể lưu: Voucher này đã hết hạn.");
            return;
          }
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
          if (new Date(form.start) > new Date(form.end)) {
            setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
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
        {isExpired ? "Voucher đã hết hạn" : "Lưu ưu đãi"}
      </Button>
    </>
  );
}
