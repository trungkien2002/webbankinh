import { Hero } from "../components/hero";
import { IconButton } from "../components/icons";
import { catalogImage } from "../components/catalogAssets";
import { prepareDemoCatalog } from "../services/catalog";
import { EmployeeForm } from "../components/employeeForm";
import { VoucherForm } from "../components/voucherForm";
import React, { useState, useEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Button,
  Choice,
  Field,
  Sheet,
  Table,
  money,
  palette as p,
  ui,
} from "../components/ui";
import { glassesArt } from "../components/productArt";
import { Product, User, InvoiceItem } from "../contracts/domain";
import { db } from "../services/database";
import { productService } from "../services/productService";
import { categoryService } from "../services/categoryService";
import { customerService } from "../services/customerService";
import { invoiceService } from "../services/invoiceService";
import { voucherService } from "../services/voucherService";
import { getDemoSession, loginDemo, logoutDemo } from "../services/demoSession";

const art = (product?: Product, index = 0) =>
  (product ? catalogImage(product.id) : undefined) ||
  product?.imageUrl ||
  glassesArt(
    ["#68432f", "#343e32", "#947640", "#263d39"][index % 4],
    product?.productType === "Kính râm",
    index % 2 === 1,
  );
const titles = [
  "Tổng quan",
  "Bán hàng tại quầy",
  "Hóa đơn",
  "Phân loại kính",
  "Sản phẩm",
  "Voucher",
  "Khách hàng",
  "Nhân viên",
];
export function WebApp() {
  const { width } = useWindowDimensions();
  const small = width < 850;
  useState(() => {
    prepareDemoCatalog();
    return true;
  });
  const [page, setPage] = useState<"store" | "login" | "admin">("store");
  const [user, setUser] = useState<User | null>(getDemoSession);
  const [section, setSection] = useState("Tổng quan");
  const [revision, refresh] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [detail, setDetail] = useState<Product | null>(null);
  const [modal, setModal] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState("");
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("cash");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const products = productService.searchProducts({
    query,
    categoryId: category || undefined,
  });
  useEffect(() => setProductPage(1), [query, category, section]);
  const totalPages = Math.max(1, Math.ceil(products.length / 12));
  const currentPage = Math.min(productPage, totalPages);
  const visibleProducts = products.slice(
    (currentPage - 1) * 12,
    currentPage * 12,
  );
  const items: InvoiceItem[] = Object.entries(cart).flatMap(
    ([id, quantity]) => {
      const product = db.products.find((v) => v.id === id && !v.isDeleted);
      return product
        ? [
            {
              id: `line-${id}`,
              productId: id,
              productName: product.name,
              sku: product.sku,
              unitPrice: product.price,
              quantity,
              lineTotal: quantity * product.price,
            },
          ]
        : [];
    },
  );
  const subtotal = items.reduce((s, v) => s + v.lineTotal, 0);
  const discount = voucher.trim()
    ? voucherService.applyVoucher({ voucherCode: voucher, subtotal })
    : null;
  const discountAmount = discount?.success ? discount.discountAmount || 0 : 0;
  const add = (product: Product) => {
    if ((cart[product.id] || 0) >= product.stock) {
      setNotice("Số lượng đã đạt tồn kho.");
      return;
    }
    setCart({ ...cart, [product.id]: (cart[product.id] || 0) + 1 });
  };
  const field = (key: string, label: string, secure = false) => (
    <Field
      label={label}
      value={form[key] || ""}
      onChange={(value) => setForm({ ...form, [key]: value })}
      secure={secure}
    />
  );
  const open = (name: string) => {
    setForm({ categoryId: db.categories.find((c) => !c.isDeleted)?.id || "" });
    setNotice("");
    setModal(name);
  };
  const navigate = (name: string) => {
    setSection(name);
    setQuery("");
    setCategory("");
    setNotice("");
  };
  const submitOrder = (paid: boolean) => {
    if (voucher.trim() && !discount?.success) {
      setNotice(discount?.error || "Voucher không hợp lệ.");
      return;
    }
    if (
      page === "store" &&
      (!form.fullName?.trim() || !/^\d{9,11}$/.test(form.phone || ""))
    ) {
      setNotice("Vui lòng nhập tên và số điện thoại từ 9 đến 11 chữ số.");
      return;
    }
    const client = db.customers.find((c) => c.id === customer);
    const employee = db.employees.find((e) => e.userId === user?.id);
    const result = invoiceService.holdPendingInvoice({
      items,
      customerId: client?.id,
      customerName: page === "store" ? form.fullName : client?.fullName,
      customerPhone: page === "store" ? form.phone : client?.phone,
      employeeId: employee?.id || "ONLINE",
      employeeName: employee?.fullName || "Cửa hàng trực tuyến",
      voucherCode: voucher || undefined,
      voucherDiscountSnapshot: discountAmount,
      notes: form.address ? `Giao đến: ${form.address}` : undefined,
    });
    if (!result.success || !result.data) {
      setNotice(result.error || "Không thể lưu đơn.");
      return;
    }
    if (paid) {
      const paymentResult = invoiceService.markAsPaid(
        result.data.id,
        payment as "cash" | "transfer",
      );
      if (!paymentResult.success) {
        setNotice(
          paymentResult.error ||
            "Thanh toán chưa thành công. Đơn đã được lưu chờ.",
        );
        return;
      }
    }
    setCart({});
    setVoucher("");
    setModal("");
    setNotice(
      `${paid ? "Đã thanh toán" : "Đã nhận đơn"} ${result.data.invoiceCode}.`,
    );
    refresh(revision + 1);
  };
  const save = () => {
    let result: { success: boolean; error?: string };
    if (modal === "Thêm phân loại")
      result = categoryService.createCategory(
        form.name || "",
        form.description || "",
      );
    else if (modal === "Thêm sản phẩm")
      result = productService.createProduct({
        sku: form.sku || "",
        name: form.name || "",
        categoryId: form.categoryId || "",
        productType: db.categories.find((c) => c.id === form.categoryId)
          ?.name as Product["productType"],
        price: Number(form.price),
        stock: Number(form.stock),
        imageUrl: form.imageUrl,
        brand: form.brand,
        currentActorRole: user!.role,
      });
    else
      result = customerService.addCustomer({
        fullName: form.fullName || "",
        phone: form.phone || "",
        email: form.email,
        address: form.address,
      });
    if (!result.success) {
      setNotice(result.error || "Vui lòng kiểm tra thông tin.");
      return;
    }
    setModal("");
    setNotice("Đã lưu thông tin.");
    refresh(revision + 1);
  };
  const cartContent = (
    <>
      <Text style={[ui.muted, { marginBottom: 20 }]}>
        Sản phẩm được giữ trong giỏ hàng cho đến khi bạn đặt hàng.
      </Text>
      {items.map((item) => (
        <View
          key={item.id}
          style={[
            ui.row,
            {
              justifyContent: "space-between",
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderColor: p.line,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={ui.label}>{item.productName}</Text>
            <Text style={ui.muted}>{money(item.unitPrice)}</Text>
          </View>
          <Button
            onPress={() => {
              const next = { ...cart };
              if (item.quantity === 1) delete next[item.productId];
              else next[item.productId]--;
              setCart(next);
            }}
          >
            −
          </Button>
          <Text>{item.quantity}</Text>
          <Button
            onPress={() =>
              add(db.products.find((v) => v.id === item.productId)!)
            }
          >
            +
          </Button>
        </View>
      ))}
      {!items.length && (
        <Text style={ui.muted}>
          Giỏ hàng đang trống. Hãy chọn một chiếc kính bạn thích.
        </Text>
      )}
      <View style={{ marginTop: 22 }}>
        <Field label="Mã ưu đãi" value={voucher} onChange={setVoucher} />
        {voucher && (
          <Text style={discount?.success ? ui.muted : ui.error}>
            {discount?.success
              ? `Giảm ${money(discountAmount)}`
              : discount?.error}
          </Text>
        )}
        <Text style={[ui.h2, { marginVertical: 18 }]}>
          Tổng cộng: {money(subtotal - discountAmount)}
        </Text>
      </View>
      {page === "store" ? (
        <>
          {field("fullName", "Họ và tên")}
          {field("phone", "Số điện thoại")}
          {field("address", "Địa chỉ nhận hàng")}
          <Button
            primary
            disabled={!items.length}
            onPress={() => submitOrder(false)}
          >
            Đặt hàng
          </Button>
        </>
      ) : (
        <>
          <Choice
            label="Khách hàng"
            value={customer}
            onChange={setCustomer}
            options={[
              { label: "Khách vãng lai", value: "" },
              ...db.customers.map((c) => ({ label: c.fullName, value: c.id })),
            ]}
          />
          <Choice
            label="Thanh toán"
            value={payment}
            onChange={setPayment}
            options={[
              { label: "Tiền mặt", value: "cash" },
              { label: "Chuyển khoản", value: "transfer" },
            ]}
          />
          <View style={ui.row}>
            <Button disabled={!items.length} onPress={() => submitOrder(false)}>
              Lưu đơn chờ
            </Button>
            <Button
              primary
              disabled={!items.length}
              onPress={() => submitOrder(true)}
            >
              Thanh toán
            </Button>
          </View>
        </>
      )}
    </>
  );
  const productCards = (
    <>
      {" "}
      <View style={[ui.row, { alignItems: "stretch", gap: 22 }]}>
        {visibleProducts.map((product, i) => (
          <View
            key={product.id}
            testID="product-card"
            style={{
              width:
                width >= 1280
                  ? "23%"
                  : width >= 850
                    ? "31%"
                    : width >= 600
                      ? "47%"
                      : "100%",
              minWidth: 200,
              flexGrow: 0,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: p.line,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem ${product.name}`}
              onPress={() => {
                setModal("");
                setDetail(product);
              }}
            >
              <Image
                source={{ uri: art(product, i) }}
                style={{
                  height: 210,
                  width: "100%",
                  backgroundColor: ["#eee8dc", "#e1e6db", "#eadfcd"][i % 3],
                }}
                resizeMode="contain"
              />
            </Pressable>
            <View style={{ padding: 20 }}>
              <Text
                style={[
                  ui.muted,
                  { fontSize: 10, letterSpacing: 2, marginBottom: 8 },
                ]}
              >
                {product.brand || "ÉLAN"} / {product.productType}
              </Text>
              <Text style={ui.h2}>
                {product.name.replace("Gọng kính ", "")}
              </Text>
              <View
                style={[
                  ui.row,
                  { justifyContent: "space-between", marginTop: 18 },
                ]}
              >
                <Text style={ui.label}>{money(product.price)}</Text>
                <Button disabled={!product.stock} onPress={() => add(product)}>
                  {product.stock ? "Thêm vào giỏ" : "Hết hàng"}
                </Button>
              </View>
            </View>
          </View>
        ))}
      </View>
      <View
        style={[
          ui.row,
          { justifyContent: "center", marginTop: 24, marginBottom: 16 },
        ]}
      >
        <Button
          disabled={currentPage === 1}
          onPress={() => setProductPage(currentPage - 1)}
        >
          Trang trước
        </Button>
        <Text style={ui.muted}>
          Trang {currentPage} / {totalPages} · {products.length} sản phẩm
        </Text>
        <Button
          disabled={currentPage === totalPages}
          onPress={() => setProductPage(currentPage + 1)}
        >
          Trang sau
        </Button>
      </View>
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: p.cream }}>
      {page === "login" ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            flexDirection: small ? "column" : "row",
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: p.green,
              padding: small ? 30 : 70,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 22, letterSpacing: 5 }}>
              ÉLAN / STUDIO
            </Text>
            <Text
              style={{
                color: "#f5eedc",
                fontSize: small ? 40 : 66,
                lineHeight: small ? 48 : 76,
                marginTop: 65,
              }}
            >
              Một góc nhìn mới.{"\n"}Một ngày rất bạn.
            </Text>
            <Image
              source={{ uri: art(db.products.find(p => p.sku === "EL0021")) }}
              style={{ height: 200, width: "100%", marginVertical: 30 }}
            />
            <Text style={{ color: "#d1dacb", lineHeight: 25 }}>
              Không gian làm việc dành cho đội ngũ cửa hàng Élan.
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: small ? 28 : 70,
              justifyContent: "center",
            }}
          >
            <View style={{ maxWidth: 400, width: "100%", alignSelf: "center" }}>
              <Text style={ui.h1}>Chào mừng trở lại</Text>
              <Text style={[ui.muted, { marginBottom: 35 }]}>
                Đăng nhập để quản lý cửa hàng của bạn.
              </Text>
              <Field label="Email" value={email} onChange={setEmail} />
              <Field
                label="Mật khẩu"
                value={password}
                onChange={setPassword}
                secure
              />
              <Text style={ui.error}>{notice}</Text>
              <Button
                primary
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    setUser(await loginDemo(email, password));
                    setPage("admin");
                    setNotice("");
                  } catch (e) {
                    setNotice((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>
              <Text style={[ui.muted, { marginVertical: 20 }]}>
                Liên hệ quản trị viên nếu bạn cần cấp tài khoản.
              </Text>
              <Button
                onPress={() => {
                  setPage("store");
                  setNotice("");
                }}
              >
                ← Quay lại cửa hàng
              </Button>
            </View>
          </View>
        </ScrollView>
      ) : page === "store" ? (
        <ScrollView>
          <View style={{ backgroundColor: p.green, padding: 10 }}>
            <Text
              style={{
                color: "#e5e8d8",
                textAlign: "center",
                fontSize: 11,
                letterSpacing: 2,
              }}
            >
              TÌM THẤY GÓC NHÌN CỦA RIÊNG BẠN
            </Text>
          </View>
          <View
            style={[
              ui.row,
              {
                padding: small ? 20 : 32,
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderColor: p.line,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 25,
                fontWeight: "700",
                letterSpacing: 4,
                color: p.green,
              }}
            >
              ÉLAN / STUDIO
            </Text>
            <View style={ui.row}>
              <IconButton
                name="grid"
                label="Bộ sưu tập"
                onPress={() => {
                  setCategory("");
                  setQuery("");
                  setModal("catalog");
                }}
              />
              <IconButton
                name="bag"
                label="Giỏ hàng"
                count={items.reduce((n, v) => n + v.quantity, 0)}
                onPress={() => {
                  setModal("cart");
                  setNotice("");
                }}
              />
              <IconButton
                name="user"
                label="Quản lý cửa hàng"
                onPress={() => {
                  setPage(user ? "admin" : "login");
                  setNotice("");
                }}
              />
            </View>
          </View>
          <View
            style={{
              maxWidth: 1280,
              width: "100%",
              alignSelf: "center",
              padding: small ? 20 : 40,
            }}
          >
            <Hero onExplore={() => setModal("catalog")} />
            <View
              style={[
                ui.row,
                {
                  justifyContent: "space-around",
                  paddingVertical: 30,
                  borderBottomWidth: 1,
                  borderColor: p.line,
                },
              ]}
            >
              {[
                "Thiết kế tinh giản",
                "Tròng kính theo độ đo",
                "Tư vấn chọn kính",
                "Chăm sóc sau mua",
              ].map((t) => (
                <Text key={t} style={ui.muted}>
                  ✦ {t}
                </Text>
              ))}
            </View>
            <View style={{ marginTop: 45, marginBottom: 26 }}>
              <Text
                style={{
                  letterSpacing: 2,
                  fontSize: 11,
                  color: p.muted,
                  marginBottom: 10,
                }}
              >
                CURATED FOR YOU
              </Text>
              <Text style={[ui.h1, { fontFamily: "ElanSans", fontSize: 38 }]}>
                Chiếc kính dành cho bạn.
              </Text>
              <Text style={ui.muted}>
                Chọn kiểu dáng yêu thích và khám phá từng chi tiết.
              </Text>
            </View>
            <Choice
              value={category}
              onChange={setCategory}
              options={[
                { label: "Tất cả", value: "" },
                ...db.categories
                  .filter((c) => !c.isDeleted)
                  .map((c) => ({ label: c.name, value: c.id })),
              ]}
            />
            <Field
              label="Tìm sản phẩm"
              value={query}
              onChange={setQuery}
              placeholder="Tên kính, mã sản phẩm…"
            />
            {productCards}
            <View
              style={{
                backgroundColor: p.green,
                borderRadius: 12,
                padding: small ? 28 : 45,
                marginTop: 55,
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  color: "#f4f0df",
                  fontFamily: "ElanSans",
                }}
              >
                Một chiếc kính tốt bắt đầu từ sự vừa vặn.
              </Text>
              <Text style={{ color: "#d3ddcc", lineHeight: 24, marginTop: 15 }}>
                Chọn gọng theo phong cách, chọn tròng theo nhu cầu. Đội ngũ Élan
                luôn sẵn sàng tư vấn cùng bạn.
              </Text>
            </View>
          </View>
          <View style={{ padding: 35, borderTopWidth: 1, borderColor: p.line }}>
            <Text style={[ui.h2, { letterSpacing: 4 }]}>ÉLAN / STUDIO</Text>
            <Text style={[ui.muted, { marginTop: 12 }]}>
              Eyewear for everyday living. • Gọng kính / Tròng kính / Kính râm
              {"\n"}128 Đường Ánh Dương, Phường Bình An, TP. Hồ Chí Minh{"\n"}Mở
              cửa 09:00 – 21:00 hằng ngày · contact@elaneyewear.vn
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, flexDirection: small ? "column" : "row" }}>
          <View
            style={{
              width: small ? "100%" : 225,
              backgroundColor: "#eaf0e7",
              padding: 22,
              borderRightWidth: 1,
              borderColor: p.line,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                letterSpacing: 3,
                fontSize: 17,
                color: p.green,
                marginBottom: 30,
              }}
            >
              ÉLAN / STUDIO
            </Text>
            <ScrollView horizontal={small}>
              {titles
                .filter(
                  (t) =>
                    user?.role === "admin" ||
                    !["Nhân viên", "Voucher"].includes(t),
                )
                .map((t, i) => (
                  <View key={t}>
                    {!small && [0, 3, 6].includes(i) && (
                      <Text
                        style={{
                          fontSize: 10,
                          color: p.muted,
                          letterSpacing: 2,
                          marginTop: 18,
                          marginBottom: 10,
                        }}
                      >
                        {i === 0
                          ? "VẬN HÀNH"
                          : i === 3
                            ? "SẢN PHẨM"
                            : "QUAN HỆ"}
                      </Text>
                    )}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => navigate(t)}
                      style={{
                        padding: 14,
                        backgroundColor:
                          section === t ? "#d6e3d4" : "transparent",
                        borderRadius: 6,
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: p.green,
                          fontWeight: section === t ? "700" : "400",
                        }}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  </View>
                ))}
            </ScrollView>
            <Button
              onPress={() => {
                setPage("store");
                setQuery("");
                setCategory("");
              }}
            >
              ← Xem cửa hàng
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <View
              style={[
                ui.row,
                {
                  padding: 22,
                  justifyContent: "space-between",
                  backgroundColor: "#fff",
                  borderBottomWidth: 1,
                  borderColor: p.line,
                },
              ]}
            >
              <Text style={ui.muted}>Élan Eyewear / Quản lý cửa hàng</Text>
              <View style={ui.row}>
                <Text style={ui.label}>
                  {user?.username} ·{" "}
                  {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                </Text>
                <Button
                  onPress={() => {
                    logoutDemo();
                    setUser(null);
                    setPage("store");
                    setNotice("");
                  }}
                >
                  Đăng xuất
                </Button>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: small ? 20 : 35 }}>
              <Text style={ui.h1}>{section}</Text>
              <Text style={[ui.muted, { marginBottom: 26 }]}>
                Không gian làm việc của cửa hàng Élan.
              </Text>
              {section === "Tổng quan" ? (
                <>
                  <View style={[ui.row, { marginBottom: 28 }]}>
                    {[
                      [
                        "Doanh thu",
                        money(
                          db.invoices
                            .filter((i) => i.paymentStatus === "paid")
                            .reduce((s, i) => s + i.totalAmount, 0),
                        ),
                      ],
                      [
                        "Đơn chờ",
                        String(
                          db.invoices.filter(
                            (i) => i.paymentStatus === "pending",
                          ).length,
                        ),
                      ],
                      [
                        "Sản phẩm",
                        String(db.products.filter((i) => !i.isDeleted).length),
                      ],
                      ["Khách hàng", String(db.customers.length)],
                    ].map(([label, value]) => (
                      <View
                        key={label}
                        style={[ui.card, { flex: 1, minWidth: 170 }]}
                      >
                        <Text style={ui.muted}>{label}</Text>
                        <Text style={[ui.h1, { marginTop: 15 }]}>{value}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[ui.card, { padding: 32 }]}>
                    <Text style={ui.h2}>Sẵn sàng cho một ngày mới</Text>
                    <Text style={[ui.muted, { marginVertical: 16 }]}>
                      Tạo đơn hàng, tư vấn sản phẩm và theo dõi các đơn đang chờ
                      ngay tại quầy.
                    </Text>
                    <View style={ui.row}>
                      <Button
                        primary
                        onPress={() => navigate("Bán hàng tại quầy")}
                      >
                        Mở quầy bán hàng
                      </Button>
                      <Button onPress={() => navigate("Hóa đơn")}>
                        Xem hóa đơn
                      </Button>
                    </View>
                  </View>
                </>
              ) : section === "Bán hàng tại quầy" ? (
                <View style={[ui.row, { alignItems: "flex-start" }]}>
                  <View style={{ flex: 2, minWidth: 280 }}>
                    <Field
                      label="Tìm kính tại quầy"
                      value={query}
                      onChange={setQuery}
                    />
                    {productCards}
                  </View>
                  <View style={[ui.card, { flex: 1, minWidth: 300 }]}>
                    <Text style={[ui.h2, { marginBottom: 18 }]}>
                      Đơn hàng hiện tại
                    </Text>
                    {cartContent}
                  </View>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      ui.row,
                      { justifyContent: "space-between", marginBottom: 22 },
                    ]}
                  >
                    <View style={{ flex: 1, maxWidth: 430 }}>
                      <Field
                        label="Tìm kiếm"
                        value={query}
                        onChange={setQuery}
                      />
                    </View>
                    {user?.role === "admin" &&
                      [
                        "Sản phẩm",
                        "Phân loại kính",
                        "Khách hàng",
                        "Nhân viên",
                      ].includes(section) && (
                        <Button
                          primary
                          onPress={() =>
                            open(
                              section === "Sản phẩm"
                                ? "Thêm sản phẩm"
                                : section === "Khách hàng"
                                  ? "Thêm khách hàng"
                                  : section === "Nhân viên"
                                    ? "Thêm nhân viên"
                                    : "Thêm phân loại",
                            )
                          }
                        >
                          +{" "}
                          {section === "Sản phẩm"
                            ? "Thêm sản phẩm"
                            : section === "Khách hàng"
                              ? "Thêm khách hàng"
                              : section === "Nhân viên"
                                ? "Thêm nhân viên"
                                : "Thêm phân loại"}
                        </Button>
                      )}
                  </View>
                  {section === "Sản phẩm" ? (
                    <Table
                      headings={["Sản phẩm", "Giá bán", "Tồn kho", "Phân loại"]}
                      rows={products.map((v, i) => [
                        <Pressable onPress={() => setDetail(v)}>
                          <Image
                            source={{ uri: art(v, i) }}
                            style={{ width: 100, height: 50 }}
                          />
                          <Text style={ui.label}>{v.name}</Text>
                          <Text style={ui.muted}>{v.sku}</Text>
                        </Pressable>,
                        money(v.price),
                        String(v.stock),
                        v.productType,
                      ])}
                    />
                  ) : section === "Phân loại kính" ? (
                    <Table
                      headings={["Phân loại", "Mô tả", "Thao tác"]}
                      rows={db.categories
                        .filter(
                          (c) =>
                            !c.isDeleted &&
                            c.name.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((c) => [
                          c.name,
                          c.description,
                          user?.role === "admin" ? (
                            <Button
                              onPress={() => {
                                setForm({ id: c.id, name: c.name });
                                setModal("Xóa phân loại");
                              }}
                            >
                              Xóa
                            </Button>
                          ) : (
                            "—"
                          ),
                        ])}
                    />
                  ) : section === "Hóa đơn" ? (
                    <>
                      <View style={ui.row}>
                        <Field
                          label="Từ ngày (YYYY-MM-DD)"
                          value={from}
                          onChange={setFrom}
                        />
                        <Field
                          label="Đến ngày (YYYY-MM-DD)"
                          value={to}
                          onChange={setTo}
                        />
                      </View>
                      <Choice
                        value={status}
                        onChange={setStatus}
                        options={[
                          { label: "Tất cả", value: "all" },
                          { label: "Chờ thanh toán", value: "pending" },
                          { label: "Đã thanh toán", value: "paid" },
                        ]}
                      />
                      <Table
                        headings={[
                          "Hóa đơn",
                          "Khách hàng",
                          "Thành tiền",
                          "Trạng thái",
                          "Thao tác",
                        ]}
                        rows={invoiceService
                          .filterInvoices({
                            searchQuery: query,
                            fromDate: from || undefined,
                            toDate: to || undefined,
                            paymentStatus: status as "all" | "paid" | "pending",
                          })
                          .map((v) => [
                            v.invoiceCode,
                            v.customerName || "Khách vãng lai",
                            money(v.totalAmount),
                            v.paymentStatus === "paid"
                              ? "Đã thanh toán"
                              : "Chờ thanh toán",
                            <View style={ui.row}>
                              <Button
                                onPress={() => {
                                  setForm({ id: v.id });
                                  setModal("Chi tiết hóa đơn");
                                }}
                              >
                                Chi tiết
                              </Button>
                              {v.paymentStatus === "pending" && (
                                <Button
                                  onPress={() => {
                                    setForm({ id: v.id });
                                    setModal("Thanh toán đơn chờ");
                                  }}
                                >
                                  Thanh toán
                                </Button>
                              )}
                            </View>,
                          ])}
                      />
                    </>
                  ) : section === "Voucher" ? (
                    <Table
                      headings={[
                        "Mã ưu đãi",
                        "Tên",
                        "Giảm giá",
                        "Hiệu lực",
                        "Thao tác",
                      ]}
                      rows={db.vouchers
                        .filter((v) =>
                          (v.code + v.name)
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((v) => [
                          v.code,
                          v.name,
                          v.discountType === "percentage"
                            ? `${v.discountValue}%`
                            : money(v.discountValue),
                          `${v.startDate} → ${v.endDate}`,
                          <View style={ui.row}>
                            <Button
                              onPress={() => {
                                setForm({ id: v.id });
                                setModal("Sửa voucher");
                              }}
                            >
                              Sửa
                            </Button>
                            <Button
                              onPress={() => {
                                const result = voucherService.updateVoucher({
                                  voucherId: v.id,
                                  isActive: !v.isActive,
                                  currentActorRole: user!.role,
                                });
                                setNotice(
                                  result.success
                                    ? "Đã cập nhật voucher."
                                    : result.error || "",
                                );
                                refresh(revision + 1);
                              }}
                            >
                              {v.isActive ? "Tạm dừng" : "Kích hoạt"}
                            </Button>
                          </View>,
                        ])}
                    />
                  ) : section === "Khách hàng" ? (
                    <Table
                      headings={[
                        "Khách hàng",
                        "Số điện thoại",
                        "Email",
                        "Hồ sơ",
                      ]}
                      rows={customerService
                        .searchCustomers({ query })
                        .customers.map((v) => [
                          v.fullName,
                          v.phone,
                          v.email || "—",
                          <Button
                            onPress={() => {
                              setForm({ id: v.id });
                              setModal("Hồ sơ khách hàng");
                            }}
                          >
                            Xem hồ sơ
                          </Button>,
                        ])}
                    />
                  ) : (
                    <Table
                      headings={[
                        "Nhân viên",
                        "Email",
                        "Số điện thoại",
                        "Vị trí",
                      ]}
                      rows={db.employees
                        .filter((v) =>
                          v.fullName
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((v) => [v.fullName, v.email, v.phone, v.position])}
                    />
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}
      {!!notice && !modal && (
        <View
          style={{
            position: "absolute",
            bottom: 24,
            left: small ? 16 : 260,
            right: 24,
            backgroundColor: "#e4eddf",
            padding: 18,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#bdcdb6",
          }}
        >
          <Pressable onPress={() => setNotice("")}>
            <Text style={ui.text}>{notice} ×</Text>
          </Pressable>
        </View>
      )}
      {detail && (
        <Sheet title={detail.name} onClose={() => setDetail(null)}>
          <Image
            source={{ uri: art(detail) }}
            style={{
              width: "100%",
              height: 230,
              backgroundColor: "#ece8de",
              borderRadius: 8,
            }}
          />
          <Text style={[ui.h1, { marginTop: 22 }]}>{money(detail.price)}</Text>
          <Text style={[ui.muted, { marginBottom: 20 }]}>
            {detail.brand || "Élan"} · {detail.material || "Thiết kế tinh giản"}{" "}
            · {detail.color || "Sắc màu tự nhiên"}
            {"\n"}
            {detail.stock} sản phẩm sẵn có · {detail.sku}
          </Text>
          <Button
            primary
            disabled={!detail.stock}
            onPress={() => {
              add(detail);
              setDetail(null);
              setNotice("Đã thêm kính vào giỏ hàng.");
            }}
          >
            Thêm vào giỏ hàng
          </Button>
        </Sheet>
      )}
      {!!modal && (
        <Sheet
          title={
            modal === "cart"
              ? "Giỏ hàng của bạn"
              : modal === "catalog"
                ? "Bộ sưu tập Élan"
                : modal
          }
          onClose={() => {
            setModal("");
            setNotice("");
          }}
        >
          <Text style={ui.error}>{notice}</Text>
          {modal === "cart" ? (
            cartContent
          ) : modal === "catalog" ? (
            <>
              <Field label="Tìm sản phẩm" value={query} onChange={setQuery} />
              {productCards}
            </>
          ) : modal === "Thêm nhân viên" ? (
            <EmployeeForm
              onSaved={() => {
                setModal("");
                setNotice("Đã tạo nhân viên và tài khoản đăng nhập.");
                refresh(revision + 1);
              }}
            />
          ) : modal === "Sửa voucher" ? (
            <VoucherForm
              voucher={db.vouchers.find((v) => v.id === form.id)!}
              onSaved={() => {
                setModal("");
                refresh(revision + 1);
              }}
            />
          ) : modal === "Thêm sản phẩm" ? (
            <>
              {field("sku", "Mã sản phẩm")}
              {field("name", "Tên kính")}
              <Choice
                label="Phân loại"
                value={form.categoryId || ""}
                onChange={(v) => setForm({ ...form, categoryId: v })}
                options={db.categories
                  .filter((c) => !c.isDeleted)
                  .map((c) => ({ label: c.name, value: c.id }))}
              />
              {field("brand", "Thương hiệu")}
              {field("price", "Giá bán")}
              {field("stock", "Tồn kho")}
              {field("imageUrl", "URL ảnh (không bắt buộc)")}
              <Button primary onPress={save}>
                Lưu sản phẩm
              </Button>
            </>
          ) : modal === "Thêm phân loại" ? (
            <>
              {field("name", "Tên phân loại")}
              {field("description", "Mô tả")}
              <Button primary onPress={save}>
                Lưu phân loại
              </Button>
            </>
          ) : modal === "Thêm khách hàng" ? (
            <>
              {field("fullName", "Họ và tên")}
              {field("phone", "Số điện thoại")}
              {field("email", "Email")}
              {field("address", "Địa chỉ")}
              <Button primary onPress={save}>
                Lưu khách hàng
              </Button>
            </>
          ) : modal === "Xóa phân loại" ? (
            <>
              <Text style={[ui.text, { marginBottom: 20 }]}>
                Xóa phân loại “{form.name}”? Phân loại đang có sản phẩm sẽ không
                thể xóa.
              </Text>
              <Button
                primary
                onPress={() => {
                  const r = categoryService.deleteCategory({
                    categoryId: form.id,
                    currentActorRole: user!.role,
                  });
                  if (!r.success) setNotice(r.error || "");
                  else {
                    setModal("");
                    refresh(revision + 1);
                  }
                }}
              >
                Xác nhận xóa
              </Button>
            </>
          ) : modal === "Hồ sơ khách hàng" ? (
            (() => {
              const c = db.customers.find((v) => v.id === form.id)!;
              return (
                <>
                  <Text style={ui.h2}>{c.fullName}</Text>
                  <Text style={ui.text}>
                    {c.phone}
                    {"\n"}
                    {c.email}
                    {"\n"}
                    {c.address}
                  </Text>
                  <Text style={[ui.h2, { marginTop: 25 }]}>Lịch sử đo mắt</Text>
                  {c.prescriptions.length ? (
                    c.prescriptions.map((r, i) => (
                      <Text key={i} style={[ui.text, { marginTop: 15 }]}>
                        {r.measuredAt} · Mắt phải: {r.sphereRight} /{" "}
                        {r.cylinderRight} / {r.axisRight}°{"\n"}Mắt trái:{" "}
                        {r.sphereLeft} / {r.cylinderLeft} / {r.axisLeft}° · PD{" "}
                        {r.pupillaryDistance}
                      </Text>
                    ))
                  ) : (
                    <Text style={ui.muted}>Chưa có lần đo mắt.</Text>
                  )}
                </>
              );
            })()
          ) : (
            (() => {
              const v = db.invoices.find((v) => v.id === form.id);
              return v ? (
                <>
                  <Text style={ui.h2}>
                    {v.invoiceCode} · {v.customerName}
                  </Text>
                  <Text style={ui.muted}>
                    {new Date(v.createdAt).toLocaleString("vi-VN")}
                  </Text>
                  {v.items.map((i) => (
                    <Text key={i.id} style={[ui.text, { marginTop: 15 }]}>
                      {i.productName} × {i.quantity} — {money(i.lineTotal)}
                    </Text>
                  ))}
                  <Text style={[ui.h2, { marginVertical: 20 }]}>
                    {money(v.totalAmount)}
                  </Text>
                  {v.notes && <Text style={ui.text}>{v.notes}</Text>}
                  {modal === "Thanh toán đơn chờ" && (
                    <>
                      <Choice
                        label="Phương thức"
                        value={payment}
                        onChange={setPayment}
                        options={[
                          { label: "Tiền mặt", value: "cash" },
                          { label: "Chuyển khoản", value: "transfer" },
                        ]}
                      />
                      <Button
                        primary
                        onPress={() => {
                          const r = invoiceService.markAsPaid(
                            v.id,
                            payment as "cash" | "transfer",
                          );
                          if (!r.success) setNotice(r.error || "");
                          else {
                            setModal("");
                            setNotice("Đã thanh toán hóa đơn.");
                            refresh(revision + 1);
                          }
                        }}
                      >
                        Xác nhận thanh toán
                      </Button>
                    </>
                  )}
                </>
              ) : null;
            })()
          )}
        </Sheet>
      )}
    </View>
  );
}
