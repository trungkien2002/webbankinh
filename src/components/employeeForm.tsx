import React, { useState } from "react";
import { Text } from "react-native";
import { Button, Field, ui } from "./ui";
import { employeeService } from "../services/employeeService";
import { setDemoPassword } from "../services/demoSession";
import { db } from "../services/database";

export function EmployeeForm({ onSaved }: { onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({
    position: "Nhân viên bán hàng",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const labels = {
    fullName: "Họ và tên",
    phone: "Số điện thoại",
    email: "Email đăng nhập",
    position: "Vị trí",
    username: "Tên tài khoản",
    password: "Mật khẩu (ít nhất 8 ký tự)",
  };
  return (
    <>
      {Object.entries(labels).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={values[key] || ""}
          secure={key === "password"}
          onChange={(v) => setValues({ ...values, [key]: v })}
        />
      ))}
      <Text style={ui.error}>{error}</Text>
      <Button
        primary
        disabled={busy}
        onPress={async () => {
          if ((values.password || "").length < 8) {
            setError("Mật khẩu phải có ít nhất 8 ký tự.");
            return;
          }
          setBusy(true);
          const oldUsers = [...db.users];
          const oldEmployees = [...db.employees];
          try {
            const result = employeeService.createEmployee({
              fullName: values.fullName,
              phone: values.phone,
              email: values.email,
              position: values.position,
              account: { username: values.username },
              currentActorRole: "admin",
            });
            if (!result.success || !result.data?.userId)
              throw new Error(result.error || "Không thể tạo nhân viên.");
            await setDemoPassword(result.data.userId, values.password);
            onSaved();
          } catch (e) {
            db.setUsers(oldUsers);
            db.setEmployees(oldEmployees);
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Tạo nhân viên và tài khoản
      </Button>
    </>
  );
}
