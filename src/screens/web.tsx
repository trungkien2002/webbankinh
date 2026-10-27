import {ExcelImport} from '../components/excel-import';
import {ProductFilters,emptyProductFilters,useDebounced,DateField,SelectField} from '../components/filter-controls';
import {MeasurementForm} from '../components/measurementForm';
import {PaymentForm} from '../components/payment-form';
import {prescriptionFromForm} from '../services/prescription-form';
import {vietnamDay} from '../services/vietnam-date';
import {invoiceTotals,DEMO_TAX_RATE} from '../services/invoice-totals';
import { EmployeeManagement } from '../components/employee-management';
import { CategoryList } from '../components/category-list';
import { RevenueReport } from '../components/revenue-report';
import { BarcodeLabel } from '../components/barcode-label';
import { ComboForm } from '../components/combo-form';
import { itemQuantities } from '../services/combo';
import { removeDraftCombo } from '../services/bao-service';
import { InvoiceList } from '../components/invoice-list';
import { ProductEdit } from '../components/product-edit';
import { deleteUnpaidInvoice } from '../services/bao-service';
import { Toast } from '../components/toast';
import { SearchPicker } from '../components/searchPicker';
import { MemberDashboard } from "../components/memberDashboard";
import { CustomerEdit } from '../components/customer-edit';
import { AppointmentReminders, CustomerAppointments, CustomerAppointmentSummary } from '../components/customer-appointments';
import { preparePresentationData } from "../services/presentationData";
import { customerSession } from "../services/customerAccount";
import { ImageUpload } from "../components/imageUpload";
import { Storefront } from "../components/storefront";
import { Hero } from "../components/hero";
import { IconButton } from "../components/icons";
import { catalogImage } from "../components/catalogAssets";
import { prepareDemoCatalog } from "../services/catalog";
import { EmployeeForm } from "../components/employeeForm";
import { VoucherForm } from "../components/voucherForm";
import { BaoAction, BaoDialog, InvoiceContent } from "../components/bao-dialog";
import { createDraft, saveDraftItems, setDraftCustomer, completeDraft, customerList } from "../services/bao-service";
import React, { useState, useEffect, useRef } from "react";
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
  (product?.imageOverride ? product.imageUrl : undefined) ||
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
  "Báo cáo doanh thu",
];
function shoppingCart(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem('elan_shopping_cart') || '{}');
    return Object.fromEntries(Object.entries(raw).filter(([id, quantity]) => db.products.some(p => p.id === id && !p.isDeleted) && Number.isInteger(quantity) && Number(quantity) > 0).map(([id, quantity]) => [id, Number(quantity)]));
  } catch { return {}; }
}
function restoredDraft() {
  const session = getDemoSession();
  const employee = db.employees.find(e => e.userId === session?.id);
  return db.invoices.filter(i => i.employeeId === employee?.id && i.paymentStatus === 'draft').at(-1);
}
function ProductThumbnail({ product, index, height = 50, width = 100 }: { product: Product; index: number; height?: number; width?: number | `${number}%` }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [product.id, product.imageUrl]);
  return <Image accessibilityLabel={`Ảnh ${product.name}`} source={{ uri: failed ? glassesArt('#68432f', product.productType === 'Kính râm', false) : art(product, index) }} onError={() => setFailed(true)} style={{ height, width }} resizeMode="contain" />;
}
export function WebApp() {
  const { width } = useWindowDimensions();
  const small = width < 1000;
  const [navOpen, setNavOpen] = useState(false);
  const [catalogWidth, setCatalogWidth] = useState(500);
  useState(() => {
    prepareDemoCatalog();
    preparePresentationData();
    return true;
  });
  const [page, setPage] = useState<"store" | "login" | "admin">(() => window.location.hash.startsWith("#/admin") ? getDemoSession() ? "admin" : "login" : "store");
  useEffect(() => { const route = () => { if (window.location.hash.startsWith('#/admin')) { const session = getDemoSession(); setUser(session); setPage(session ? 'admin' : 'login'); } }; window.addEventListener('hashchange', route); return () => window.removeEventListener('hashchange', route); }, []);
  const [user, setUser] = useState<User | null>(getDemoSession);
  const [section, setSection] = useState("Tổng quan");
  const [revision, refresh] = useState(0);
  const [productPage, setProductPage] = useState(1);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<Record<string, number>>(shoppingCart);
  const [draftId, setDraftId] = useState(restoredDraft()?.id || '');
  useEffect(() => {
    if (page === 'store') { setCart(shoppingCart()); setVoucher(''); }
    if (page === 'admin') { const draft = restoredDraft(); setCart(itemQuantities(draft?.items || [])); setDraftId(draft?.id || ''); setVoucher(draft?.voucherCode || ''); }
  }, [page]);
  const newDraftLock = useRef(false);
  const [baoDialog, setBaoDialog] = useState<{ action: BaoAction; id?: string } | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [modal, setModal] = useState("");
  const [customerEditId, setCustomerEditId] = useState('');
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("b");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState(restoredDraft()?.voucherCode || '');
  const [customer, setCustomer] = useState(restoredDraft()?.customerId || '');
  const [payment, setPayment] = useState("cash");
  const [status, setStatus] = useState("all");
  const [stockFilter, setStockFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [advanced,setAdvanced]=useState({...emptyProductFilters});
  const [production,setProduction]=useState('all');
  const [voucherStatus,setVoucherStatus]=useState<'all'|'active'|'upcoming'|'expired'|'disabled'>('all');
  const productQuery=useDebounced(query);
  const products = productService.searchProducts({
    ...advanced,
    query:productQuery,
    categoryId: category || undefined,
  }).filter(p => stockFilter === 'all' || (stockFilter === 'available' ? p.stock > 0 : p.stock === 0))
    .sort((a, b) => sort === 'price-asc' ? a.price - b.price || a.id.localeCompare(b.id) : sort === 'price-desc' ? b.price - a.price || a.id.localeCompare(b.id) : a.name.localeCompare(b.name, 'vi') || a.id.localeCompare(b.id));
  useEffect(() => setProductPage(1), [query, category, section,advanced]);
  useEffect(() => setProductPage(1), [stockFilter, sort]);
  useEffect(() => {
    if (!user) return;
    const expire = () => { setUser(null); setPage('login'); setCart({}); setDraftId(''); setModal(''); setBaoDialog(null); setCustomerEditId(''); };
    const check = () => { const session=getDemoSession(); if(!session||session.id!==user.id){expire();return false;} if(session.role!==user.role||session.email!==user.email)setUser(session);return true; };
    const guard = (event: Event) => { if(!getDemoSession()&&page==='admin'){event.preventDefault();event.stopImmediatePropagation();expire();} };
    document.addEventListener('click',guard,true);document.addEventListener('submit',guard,true);
    const timer=setInterval(check,1500);
    return () => {clearInterval(timer);document.removeEventListener('click',guard,true);document.removeEventListener('submit',guard,true);};
  }, [user,page]);
  const totalPages = Math.max(1, Math.ceil(products.length / (section === "Bán hàng tại quầy" ? 6 : 12)));
  const currentPage = Math.min(productPage, totalPages);
  const visibleProducts = products.slice(
    (currentPage - 1) * (section === "Bán hàng tại quầy" ? 6 : 12),
    currentPage * (section === "Bán hàng tại quầy" ? 6 : 12),
  );
  const activeDraft = db.invoices.find(i => i.id === draftId && ['draft', 'pending'].includes(i.paymentStatus));
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
              lineTotal: page === 'admin' && activeDraft ? activeDraft.items.filter(i=>i.productId===id).reduce((s,i)=>s+i.lineTotal,0) : quantity * product.price,
            },
          ]
        : [];
    },
  );
  const subtotal = page === 'admin' && activeDraft ? activeDraft.subtotal : items.reduce((s, v) => s + v.lineTotal, 0);
  const discount = voucher.trim()
    ? voucherService.applyVoucher({ voucherCode: voucher, subtotal })
    : null;
  const discountAmount = discount?.success ? discount.discountAmount || 0 : 0;

  const changeCart = (next: Record<string, number>) => {
    try {
      if (page === 'admin') {
        if (!activeDraft && !Object.keys(next).length) return;
        const draft = activeDraft || createDraft(user!.id);
        saveDraftItems(user!.id, draft.id, next, voucher);
        if (Object.keys(next).length) {
          if (!activeDraft && customer) setDraftCustomer(user!.id, draft.id, customer);
          setDraftId(draft.id);
        } else { setDraftId(''); setCustomer(''); setVoucher(''); }
      }
      if (page === 'store') localStorage.setItem('elan_shopping_cart', JSON.stringify(next));
      setCart(next); setNotice(''); refresh(v => v + 1);
    } catch (e) { setNotice((e as Error).message); }
  };
  const newDraft = () => {
    if (newDraftLock.current) return;
    newDraftLock.current = true;
    try {
      const draft = createDraft(user!.id);
      setDraftId(draft.id); setCart({}); setCustomer(''); setVoucher('');
      setNotice(`Đã tạo ${draft.invoiceCode}. Đơn nháp được lưu cục bộ.`); refresh(v => v + 1);
    } catch (e) { setNotice((e as Error).message); }
    finally { setTimeout(() => { newDraftLock.current = false; }, 400); }
  };
  const add = (product: Product) => {
    if ((cart[product.id] || 0) >= product.stock) {
      setNotice("Số lượng đã đạt tồn kho.");
      return;
    }
    changeCart({ ...cart, [product.id]: (cart[product.id] || 0) + 1 });
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
    setForm({required:'no',measuredAt:vietnamDay(), categoryId: db.categories.find((c) => !c.isDeleted)?.id || "", productType: 'Gọng kính' });
    setNotice("");
    setModal(name);
  };
  const navigate = (name: string) => {
    setNavOpen(false);
    setSection(name);
    setQuery("");
    setCategory("");
    setStockFilter('all'); setSort('name'); setAdvanced({...emptyProductFilters});setProduction('all');setVoucherStatus('all');setFrom('');setTo('');
    setNotice("");
  };
  const submitOrder = (paid: boolean) => {
    if (page === 'admin') {
      try {
        if (!activeDraft) throw new Error('Hãy tạo đơn nháp trước.');
        if(getDemoSession()?.id!==user?.id)throw new Error('Phiên đã hết hạn.');
        saveDraftItems(user!.id, activeDraft.id, cart, voucher);
        if(paid){setForm({id:activeDraft.id});setModal('Thanh toán đơn chờ');refresh(v=>v+1);return;}
        completeDraft(user!.id, activeDraft.id, paid, payment as 'cash' | 'transfer');
        setCart({}); setDraftId(''); setCustomer(''); setVoucher(''); setModal('');
        setNotice(`${paid ? 'Đã thanh toán' : 'Đã lưu đơn chờ'} ${activeDraft.invoiceCode}.`);
        refresh(v => v + 1);
      } catch (e) { setNotice((e as Error).message); }
      return;
    }
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
    if (page === 'store' && !form.address?.trim()) {
      setNotice('Vui lòng nhập địa chỉ nhận hàng.');
      return;
    }
    const client = page === "store" ? customerSession() : db.customers.find((c) => c.id === customer);
    const employee = db.employees.find((e) => e.userId === user?.id);
    const result = invoiceService.holdPendingInvoice({
      items,
      customerId: client?.id,
      customerName: page === "store" ? form.fullName : client?.fullName,
      customerPhone: page === "store" ? form.phone : client?.phone,
      taxRate:DEMO_TAX_RATE,
      employeeId: page === 'store' ? 'ONLINE' : employee?.id || 'ONLINE',
      employeeName: page === 'store' ? 'Cửa hàng trực tuyến' : employee?.fullName || 'Cửa hàng trực tuyến',
      voucherCode: voucher || undefined,
      voucherDiscountSnapshot: discountAmount,
      deliveryAddress: page === 'store' ? form.address : undefined,
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
    if (page === "store") localStorage.removeItem("elan_shopping_cart");
    setCart({});
    setVoucher("");
    setModal("");
    setNotice(
      `${paid ? "Đã thanh toán" : "Đã nhận đơn"} ${result.data.invoiceCode}.`,
    );
    refresh(revision + 1);
  };
  const save = () => {
    if(page==='admin'&&getDemoSession()?.id!==user?.id){setNotice('Phiên đã hết hạn. Hãy đăng nhập lại.');return;}
    let initialPrescription;
    try {initialPrescription=modal==='Thêm khách hàng'?prescriptionFromForm(form):undefined;}catch(e){setNotice((e as Error).message);return;}
    let result: { success: boolean; error?: string };
    if (modal === "Thêm phân loại")
      result = categoryService.createCategory(
        form.name || "",
        form.description || "",
      );
    else if (["Thêm sản phẩm", "Sửa sản phẩm"].includes(modal))
      result = (modal === "Sửa sản phẩm" ? (input: Parameters<typeof productService.createProduct>[0]) => productService.updateProduct(form.id,input) : (input: Parameters<typeof productService.createProduct>[0]) => productService.createProduct(input))({
        actorId: user?.id,
        sku: form.sku || "",
        name: form.name || "",
        categoryId: form.categoryId || "",
        productType: (form.productType || 'Gọng kính') as Product['productType'],
        price: Number(form.price),
        stock: Number(form.stock),
        imageUrl: form.imageUrl,
        brand: form.brand,
        barcode: form.barcode,
        currentActorRole: user!.role,
      });
    else
      result = customerService.addCustomer({
        prescription:initialPrescription,
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
          <Image source={{ uri: art(db.products.find(v => v.id === item.productId)!) }} resizeMode="contain" style={{width:64,height:52,borderRadius:7,backgroundColor:"#e9e9e9"}} />
          <View style={{ flex: 1, minWidth:100 }}>
            <Text style={ui.label}>{item.productName}</Text>
            <Text style={ui.muted}>{page === 'admin' ? `Thành tiền: ${money(item.lineTotal)}` : money(item.unitPrice)}</Text>
          </View>
          <Button
            onPress={() => {
              const next = { ...cart };
              if (item.quantity === 1) delete next[item.productId];
              else next[item.productId]--;
              changeCart(next);
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
          Tổng cộng: {money(invoiceTotals(subtotal,discountAmount,page==='admin'?activeDraft?.assemblyFee||0:0,page==='admin'?activeDraft?.taxRate||0:DEMO_TAX_RATE).totalAmount)}
        </Text>
      </View>
      <Text style={ui.muted}>Thuế {page==='admin'?activeDraft?.taxRate||0:DEMO_TAX_RATE}%: {money(invoiceTotals(subtotal,discountAmount,page==='admin'?activeDraft?.assemblyFee||0:0,page==='admin'?activeDraft?.taxRate||0:DEMO_TAX_RATE).taxAmount)}</Text>
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
          <SearchPicker
            label="Khách hàng"
            value={customer}
            onChange={value => {
              try {
                if (activeDraft && user) setDraftCustomer(user.id, activeDraft.id, value);
                setCustomer(value); refresh(v => v + 1);
              } catch (e) { setNotice((e as Error).message); }
            }}
            options={[
              { label: "Khách vãng lai", value: "" },
              ...db.customers.map((c) => ({ label: c.fullName + " · " + c.phone, value: c.id, search: c.customerCode })),
            ]}
          />
          <Button disabled={!activeDraft} onPress={() => setBaoDialog({ action: 'measurement', id: activeDraft?.id })}>Khách hàng / thông số đo mắt</Button>
          <Button iconOnly={false} onPress={()=>{try{const draft=activeDraft||createDraft(user!.id);setDraftId(draft.id);setModal('Thêm combo kính');}catch(e){setNotice((e as Error).message);}}}>Chọn combo gọng + tròng</Button>
          {!!activeDraft?.assemblyFee&&<Text style={ui.label}>Công mài: {money(activeDraft.assemblyFee)} (không áp voucher)</Text>}
          {(activeDraft?.combos||[]).map(combo=><View key={combo.id} style={[ui.card,{padding:12,gap:6}]}><Text style={ui.label}>{combo.quantity} combo · {db.products.find(p=>p.id===combo.frameId)?.name} + {db.products.find(p=>p.id===combo.lensId)?.name}</Text><Text style={ui.muted}>Công mài {money(combo.quantity*combo.assemblyUnitFee)} · Số đo {combo.prescription.measuredAt}</Text><Button onPress={()=>{try{removeDraftCombo(user!.id,activeDraft!.id,combo.id);const updated=db.invoices.find(i=>i.id===draftId);setCart(itemQuantities(updated?.items||[]));if(!updated){setDraftId('');setCustomer('');setVoucher('');}refresh(v=>v+1);}catch(e){setNotice((e as Error).message);}}}>Xóa</Button></View>)}
          {activeDraft?.prescription && <Text style={ui.muted}>Đã lưu thông số đo mắt ngày {activeDraft.prescription.measuredAt}.</Text>}
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
      <View style={[ui.row, { alignItems: "stretch", gap: 14 }]}>
        {visibleProducts.slice(0, section === "Bán hàng tại quầy" ? 6 : 12).map((product, i) => (
          <View
            key={product.id}
            testID="product-card"
            style={{
              width: catalogWidth >= 850 ? "31%" : catalogWidth >= 340 ? "47%" : "100%",
              minWidth: 0,
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
              <View style={{ backgroundColor: "#e9e9e9" }}><ProductThumbnail product={product} index={i} height={120} width="100%" /></View>
            </Pressable>
            <View style={{ padding: 16, flex: 1 }}>
              <Text
                style={[
                  ui.muted,
                  { fontSize: 10, letterSpacing: 1, marginBottom: 6, minHeight: 20 },
                ]}
              >
                {product.brand || "ÉLAN"} / {product.productType}
              </Text>
              <Text numberOfLines={2} style={[ui.h2, { fontSize: 15, lineHeight: 21, minHeight: 42 }]}>
                {product.name.replace("Gọng kính ", "")}
              </Text>
              <View
                style={[
                  ui.row,
                  { justifyContent: "space-between", marginTop: "auto", paddingTop: 16 },
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
        <Button disabled={currentPage === 1} onPress={() => setProductPage(currentPage - 1)}>‹</Button>
        {Array.from({ length: totalPages }, (_, i) => <Button key={i} primary={i + 1 === currentPage} onPress={() => setProductPage(i + 1)}>{i + 1}</Button>)}
        <Button disabled={currentPage === totalPages} onPress={() => setProductPage(currentPage + 1)}>›</Button>
      </View>
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: p.cream }}>
      {modal==='Mã vạch và in tem'&&<Sheet title="Mã vạch và in tem" onClose={()=>setModal('')}><BarcodeLabel actorId={user!.id} productId={form.id} onSaved={()=>{refresh(v=>v+1);setNotice('Đã lưu mã vạch.');}}/></Sheet>}
      {modal==='Thêm combo kính'&&<Sheet title="Combo gọng và tròng" onClose={()=>setModal('')}><ComboForm actorId={user!.id} invoiceId={draftId} onSaved={()=>{setCart(itemQuantities(db.invoices.find(i=>i.id===draftId)?.items||[]));refresh(v=>v+1);setModal('');setNotice('Đã thêm combo.');}}/></Sheet>}
      {page === "login" ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            flexDirection: small ? "column" : "row",
          }}
        >
          <View
            style={{
              flex: small ? undefined : 1,
              backgroundColor: "#e9e9e9",
              minHeight: small ? 240 : undefined,
              padding: small ? 24 : 40,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: p.green, fontSize: 22, letterSpacing: 5 }}>
              ÉLAN / STUDIO
            </Text>
            <Text
              style={{
                color: p.green,
                fontSize: small ? 28 : width < 1200 ? 38 : 48,
                lineHeight: small ? 39 : 58,
                marginTop: small ? 15 : 35,
              }}
            >
              Một góc nhìn mới.{"\n"}Tự tin trong từng ánh nhìn.
            </Text>
            {!small && <Image
              source={{ uri: art(db.products.find(p => p.sku === "EL0021")) }}
              style={{ height: 180, width: "100%", marginVertical: 25, mixBlendMode: "darken" } as any}
            />}
            <Text style={{ color: p.muted, lineHeight: 25 }}>
              Không gian làm việc dành cho đội ngũ cửa hàng Élan.
            </Text>
          </View>
          <View
            style={{
              flex: small ? undefined : 1,
              padding: small ? 24 : 40,
              justifyContent: "center",
            }}
          >
            <View style={{ maxWidth: 400, width: "100%", alignSelf: "center" }}>
              <Text style={ui.h1}>Chào mừng trở lại</Text>
              <Text style={[ui.muted, { marginBottom: 35 }]}>
                Đăng nhập để quản lý cửa hàng của bạn.
              </Text>
              <Field label="Tài khoản" value={email} onChange={setEmail} />
              <Field
                label="Mật khẩu"
                value={password}
                onChange={setPassword}
                secure
              />

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
              <Button onPress={() => setBaoDialog({ action: 'password-reset' })}>Quên mật khẩu</Button>
              <Button
                onPress={() => {
                  setPage("store"); window.location.hash = "/";
                  setNotice("");
                }}
              >
                ← Quay lại cửa hàng
              </Button>
            </View>
          </View>
        </ScrollView>
      ) : page === "store" ? (
        <Storefront cartProps={{ items, quantity: (id, value) => { const product = db.products.find(p => p.id === id); if (!product || value > product.stock) { setNotice("Số lượng đã đạt tồn kho."); return; } const next = { ...cart }; if (value <= 0) delete next[id]; else next[id] = value; changeCart(next); }, voucher, setVoucher, discount: discountAmount, voucherError: voucher && !discount?.success ? discount?.error : undefined, form, setForm, order: () => submitOrder(false) }} items={items} add={add} cartContent={cartContent} notice={notice} admin={() => { setPage(user ? "admin" : "login"); setNotice(""); }} />
      ) : (
        <View style={{ flex: 1, flexDirection: small ? "column" : "row" }}>
          <View
            style={{
              width: small ? "100%" : 225,
              backgroundColor: "#eaf0e7",
              padding: small ? 16 : 22,
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
            {small && <Button onPress={() => setNavOpen(v => !v)}>{navOpen ? "Đóng menu" : "Menu quản lý"}</Button>}
            {(!small || navOpen) && <ScrollView horizontal={false} style={{ maxHeight: small ? 290 : undefined }}>
              {titles
                .filter(
                  (t) =>
                    user?.role === "admin" ||
                    !["Nhân viên", "Voucher", "Báo cáo doanh thu"].includes(t),
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
            </ScrollView>}
            {!small && <Button
              onPress={() => {
                setPage("store"); window.location.hash = "/";
                setQuery("");
                setCategory("");
              }}
            >
              ← Xem cửa hàng
            </Button>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
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
              <View style={[ui.row, { width: small ? "100%" : undefined, flexShrink: 1 }]}>
                <Text style={ui.label}>
                  {user?.username} ·{" "}
                  {user?.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                </Text>
                {small && <Button onPress={() => { setPage("store"); window.location.hash = "/"; }}>Xem cửa hàng</Button>}
                <Button
                  onPress={() => {
                    logoutDemo();
                    setUser(null);
                    setPage("store"); window.location.hash = "/";
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
              {['Tổng quan', 'Khách hàng'].includes(section) && user && <AppointmentReminders actorId={user.id} onOpen={id => { setForm({ id }); setModal('Hồ sơ khách hàng'); }} />}
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
                        style={[ui.card, { flexGrow: 1, flexBasis: width < 1300 ? "46%" : "22%", minWidth: 0, minHeight: 130 }]}
                      >
                        <Text style={ui.muted}>{label}</Text>
                        <Text numberOfLines={1} adjustsFontSizeToFit style={[ui.h1, { marginTop: 15, fontSize: width < 600 ? 23 : 27 }]}>{value}</Text>
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
              ) : section === "Báo cáo doanh thu" ? (
                <RevenueReport actorId={user!.id} onDetail={id=>setBaoDialog({action:'invoice-detail',id})}/>
              ) : section === "Bán hàng tại quầy" ? (
                <View style={{ flexDirection: width < 1000 ? "column" : "row", alignItems: "flex-start", gap: 24 }}>
                  <View onLayout={e => setCatalogWidth(e.nativeEvent.layout.width)} style={{ flex: width < 1000 ? undefined : 1, width: width < 1000 ? "100%" : undefined, minWidth: 0 }}>
                    <Field
                      label="Tìm kính tại quầy"
                      value={query}
                      onChange={setQuery}
                    />
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:14}}>
                      <View style={{flex:1,minWidth:140}}><Text style={ui.label}>Phân loại</Text><select aria-label="Lọc phân loại tại quầy" value={category} onChange={e=>setCategory(e.target.value)} style={{width:'100%',padding:11,border:'1px solid #cad5c5',borderRadius:8,background:'#fff',color:'#284e43'}}><option value="">Tất cả</option>{db.categories.filter(c=>!c.isDeleted).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></View>
                      <View style={{flex:1,minWidth:120}}><Text style={ui.label}>Tồn kho</Text><select aria-label="Lọc tồn kho tại quầy" value={stockFilter} onChange={e=>setStockFilter(e.target.value)} style={{width:'100%',padding:11,border:'1px solid #cad5c5',borderRadius:8,background:'#fff',color:'#284e43'}}><option value="all">Tất cả</option><option value="available">Còn hàng</option><option value="empty">Hết hàng</option></select></View>
                      <View style={{flex:1,minWidth:130}}><Text style={ui.label}>Sắp xếp</Text><select aria-label="Sắp xếp tại quầy" value={sort} onChange={e=>setSort(e.target.value)} style={{width:'100%',padding:11,border:'1px solid #cad5c5',borderRadius:8,background:'#fff',color:'#284e43'}}><option value="name">Tên A–Z</option><option value="price-asc">Giá tăng</option><option value="price-desc">Giá giảm</option></select></View>
                    </View>
                    <ProductFilters value={advanced} onChange={setAdvanced} onReset={()=>{setAdvanced({...emptyProductFilters});setQuery('');setCategory('');setStockFilter('all');setSort('name');}}/>
                    {productCards}
                  </View>
                  <View style={[ui.card, { width: width < 1000 ? "100%" : width < 1300 ? 360 : 410, minWidth: 0 }]}>
                    <Text style={[ui.h2, { marginBottom: 18 }]}>
                      {activeDraft?.invoiceCode || 'Đơn hàng hiện tại'}
                    </Text>
                    <Button onPress={newDraft}>Tạo hóa đơn mới</Button>
                    <Text style={ui.muted}>Đơn nháp lưu cục bộ; mở lại từ danh sách hóa đơn.</Text>
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
                        "Voucher",
                      ].includes(section) && (
                        <Button
                          primary
                          onPress={() => section === 'Voucher' ? setBaoDialog({ action: 'voucher-create' }) :
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
                          {section === 'Voucher' ? 'Thêm voucher' : section === "Sản phẩm"
                            ? "Thêm sản phẩm"
                            : section === "Khách hàng"
                              ? "Thêm khách hàng"
                              : section === "Nhân viên"
                                ? "Thêm nhân viên"
                                : "Thêm phân loại"}
                        </Button>
                      )}
                  </View>
                  {section === "Sản phẩm" ? (<>
                    <ProductFilters value={advanced} onChange={setAdvanced} onReset={()=>{setAdvanced({...emptyProductFilters});setQuery('');setCategory('');setStockFilter('all');setSort('name');}}/>
                    {user?.role==='admin'&&<ExcelImport kind="product" actorId={user.id} onChanged={()=>refresh(v=>v+1)}/>}

                    <Choice label="Tồn kho" value={stockFilter} onChange={setStockFilter} options={[{ label: 'Tất cả', value: 'all' }, { label: 'Còn hàng', value: 'available' }, { label: 'Hết hàng', value: 'empty' }]} />
                    <Choice label="Sắp xếp" value={sort} onChange={setSort} options={[{ label: 'Tên', value: 'name' }, { label: 'Giá tăng', value: 'price-asc' }, { label: 'Giá giảm', value: 'price-desc' }]} />
                    <Table
                      key={`${productQuery}-${stockFilter}-${sort}-${JSON.stringify(advanced)}`}
                      headings={["Sản phẩm", "Giá bán", "Tồn kho", "Phân loại", "Thao tác"]}
                      rows={products.map((v, i) => [
                        <Pressable onPress={() => setDetail(v)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0 }}>
                          <View style={{ width: 76, height: 64, backgroundColor: '#e9e9e9', borderRadius: 8, overflow: 'hidden' }}><ProductThumbnail product={v} index={i} width={76} height={64} /></View>
                          <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={2} style={[ui.label, { lineHeight: 21 }]}>{v.name}</Text><Text style={ui.muted}>{v.sku}</Text></View>
                        </Pressable>,
                        money(v.price),
                        `${v.stock} · ${v.stock > 0 ? 'Còn hàng' : 'Hết hàng'}`,
                        db.categories.find(c => c.id === v.categoryId)?.name || v.productType,                        <View style={ui.row}><Button onPress={() => setDetail(v)}>Chi tiết</Button>{user?.role==='admin'&&<><Button onPress={()=>{setForm({id:v.id,sku:v.sku,name:v.name,categoryId:v.categoryId,productType:v.productType,price:String(v.price),stock:String(v.stock),brand:v.brand||'',imageUrl:v.imageUrl||''});setModal('Sửa sản phẩm');}}>Sửa</Button><Button onPress={()=>{setForm({id:v.id,name:v.name});setModal('Xóa sản phẩm');}}>Xóa</Button><IconButton name="barcode" label="Mã vạch và in tem" onPress={()=>{setForm({id:v.id});setModal('Mã vạch và in tem');}}/></>}</View>,
                      ])}
                    /></>
                  ) : section === "Phân loại kính" ? (
                    <>{user?.role==='admin'&&<ExcelImport kind="category" actorId={user!.id} onChanged={()=>refresh(v=>v+1)}/>}
                    <CategoryList actorId={user!.id} query={query} revision={revision} admin={user?.role==='admin'}
                      onDetail={id=>setBaoDialog({action:'category-detail',id})}
                      onEdit={id=>setBaoDialog({action:'category-edit',id})}
                      onDelete={c=>{setForm({id:c.id,name:c.name});setModal('Xóa phân loại');}} /></>
                  ) : section === "Hóa đơn" ? (
                    <>
                      <View style={ui.row}><DateField label="Từ ngày hóa đơn" value={from} onChange={setFrom}/><DateField label="Đến ngày hóa đơn" value={to} onChange={setTo}/></View>
                      <SelectField label="Tiến độ gia công" value={production} onChange={setProduction} options={[{label:'Tất cả',value:'all'},{label:'Không gia công',value:'none'},{label:'Đang cắt tròng',value:'cutting_lens'},{label:'Hoàn tất',value:'completed'},{label:'Đã giao',value:'delivered'}]}/>
                      <Button onPress={()=>{setFrom('');setTo('');setStatus('all');setProduction('all');setQuery('');}}>Xóa bộ lọc hóa đơn</Button>
                      <Choice
                        value={status}
                        onChange={setStatus}
                        options={[
                          { label: "Tất cả", value: "all" },
                          { label: "Chờ thanh toán", value: "pending" },
                          { label: "Đã thanh toán", value: "paid" },
                          { label: 'Đơn nháp', value: 'draft' },
                          { label: 'Đã hủy', value: 'cancelled' },
                        ]}
                      />
                      <InvoiceList
                        actorId={user!.id}
                        filter={{ productionStatus:production as any, searchQuery: query, fromDate: from || undefined, toDate: to || undefined, paymentStatus: status as 'all' | 'paid' | 'pending' | 'draft' | 'cancelled' }}
                        onDetail={id => setBaoDialog({ action: 'invoice-detail', id })}
                        onOpen={invoice => {
                          setDraftId(invoice.id);
                          setCart(itemQuantities(invoice.items));
                          setCustomer(invoice.customerId || ''); setVoucher(invoice.voucherCode || ''); setSection('Bán hàng tại quầy');
                        }}
                        onDelete={id => { setForm({ id }); setModal('Xóa hóa đơn'); }}
                        onPay={id => { setForm({ id }); setModal('Thanh toán đơn chờ'); }}
                      />
                    </>
                  ) : section === "Voucher" ? (
                    <><SelectField label="Trạng thái voucher" value={voucherStatus} onChange={v=>setVoucherStatus(v as typeof voucherStatus)} options={[{label:'Tất cả',value:'all'},{label:'Đang áp dụng',value:'active'},{label:'Sắp áp dụng',value:'upcoming'},{label:'Hết hạn',value:'expired'},{label:'Vô hiệu',value:'disabled'}]}/>
                    <Button onPress={()=>{setVoucherStatus('all');setQuery('');}}>Xóa bộ lọc voucher</Button>

                    <Table key={`${query}-${voucherStatus}`}
                      headings={[
                        "Mã ưu đãi",
                        "Tên",
                        "Giảm giá",
                        "Hiệu lực",
                        "Thao tác",
                      ]}
                      rows={voucherService.filterVouchers({query,status:voucherStatus}).map((v) => [
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
                    /></>
                  ) : section === "Khách hàng" ? (
                    <Table
                      key={`customers-${query}`}
                      headings={[
                        "Khách hàng",
                        "Số điện thoại",
                        "Email",
                        "Số lần mua / lần gần nhất",
                        "Hẹn tái khám",
                        "Hồ sơ",
                      ]}
                      rows={customerList(user!.id, query).map((v) => [
                          v.fullName,
                          v.phone,
                          v.email || "—",
                          `${v.purchaseCount} · ${v.lastPurchase?.slice(0, 10) || 'Chưa mua'}`,
                          <CustomerAppointmentSummary actorId={user!.id} customerId={v.id} />,
                          <View style={ui.row}><Button
                            onPress={() => {
                              setForm({ id: v.id });
                              setModal("Hồ sơ khách hàng");
                            }}
                          >
                            Xem hồ sơ
                          </Button><Button onPress={() => setCustomerEditId(v.id)}>Sửa khách hàng</Button></View>,
                        ])}
                    />
                  ) : (
<EmployeeManagement actorId={user!.id} query={query} onEdit={id => setBaoDialog({action:'employee-edit',id})} onChanged={() => refresh(v=>v+1)} />
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      )}
      {!!customerEditId && user && <Sheet title="Sửa khách hàng" onClose={() => setCustomerEditId('')}>
        <CustomerEdit key={customerEditId} actorId={user.id} customerId={customerEditId} onSaved={() => {
          setCustomerEditId(''); refresh(value => value + 1); setNotice('Đã lưu khách hàng.');
        }} />
      </Sheet>}
      {baoDialog && <BaoDialog key={`${baoDialog.action}-${baoDialog.id || ''}`} action={baoDialog.action} targetId={baoDialog.id} userId={user?.id} onClose={() => setBaoDialog(null)} onSaved={() => {
        setBaoDialog(null); refresh(v => v + 1); setNotice('Đã lưu dữ liệu cục bộ.');
        const current = db.invoices.find(i => i.id === draftId); if (current) setCustomer(current.customerId || '');
      }} />}
      <Toast message={notice} onClose={() => setNotice("")} />
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
            · {detail.color || "Sắc màu tự nhiên"} · {detail.shape || "Chưa khai báo dáng"}
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
      {!!modal && !['Mã vạch và in tem','Thêm combo kính'].includes(modal) && (
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
          ) : modal === 'Sửa sản phẩm' ? (
            <ProductEdit key={form.id} actorId={user!.id} productId={form.id} onSaved={() => { setModal(''); refresh(v => v + 1); setNotice('Đã lưu sản phẩm.'); }} />
          ) : ["Thêm sản phẩm", "Sửa sản phẩm"].includes(modal) ? (
            <>
              {field("sku", "Mã sản phẩm")}
              {field("barcode", "Mã vạch (không bắt buộc)")}
              {field("name", "Tên kính")}
              <Choice
                label="Phân loại"
                value={form.categoryId || ""}
                onChange={(v) => setForm({ ...form, categoryId: v })}
                options={db.categories
                  .filter((c) => !c.isDeleted)
                  .map((c) => ({ label: c.name, value: c.id }))}
              />
              <Choice label="Loại sản phẩm" value={form.productType || 'Gọng kính'} onChange={value => setForm({ ...form, productType: value })} options={['Gọng kính', 'Tròng kính', 'Kính râm', 'Phụ kiện'].map(value => ({ label: value, value }))} />
              {field("brand", "Thương hiệu")}
              {field("price", "Giá bán")}
              {field("stock", "Tồn kho")}
              <ImageUpload value={form.imageUrl || ""} onChange={value => setForm({ ...form, imageUrl: value })} />
              {field("imageUrl", "Hoặc URL ảnh (không bắt buộc)")}
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
              <MeasurementForm form={form} set={(key,value)=>setForm(f=>({...f,[key]:value}))} showCustomer={false}/>
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
          ) : modal === "Xóa sản phẩm" ? (
            <View style={{gap:18}}><Text style={ui.text}>Xóa sản phẩm “{form.name}” khỏi danh mục? Thông tin trong hóa đơn cũ vẫn được giữ.</Text><View style={ui.row}><Button onPress={()=>setModal('')}>Giữ lại</Button><Button primary onPress={()=>{const result=productService.deleteProduct(form.id,user!.role);if(!result.success){setNotice(result.error||'');return;}setModal('');setNotice('Đã xóa sản phẩm.');refresh(v=>v+1);}}>Xác nhận xóa</Button></View></View>
          ) : modal === "Xóa hóa đơn" ? (
            <View style={{gap:18}}><Text style={ui.text}>Xóa hóa đơn {db.invoices.find(v => v.id === form.id)?.invoiceCode}? Thao tác này sẽ bỏ đơn khỏi danh sách.</Text><View style={ui.row}><Button onPress={() => setModal("")}>Giữ lại</Button><Button primary onPress={() => { try { deleteUnpaidInvoice(user!.id,form.id); if(draftId===form.id){setDraftId('');setCart({});setCustomer('');setVoucher('');} setModal('');setNotice('Đã xóa hóa đơn.');refresh(v=>v+1); } catch(e){setNotice((e as Error).message);} }}>Xác nhận xóa</Button></View></View>
          ) : modal === "Hồ sơ khách hàng" ? (
            db.customers.some(v => v.id === form.id) ? <View style={{ gap: 18 }}>
              <Button onPress={() => { setCustomerEditId(form.id); setModal(''); }}>Sửa khách hàng</Button>
              <CustomerAppointments key={form.id} actorId={user!.id} customerId={form.id} onChanged={message => { refresh(value => value + 1); setNotice(message); }} />
              <MemberDashboard key={`${form.id}-${revision}`} customer={db.customers.find(v => v.id === form.id)!} />
            </View> : <Text style={ui.error}>Khách hàng không tồn tại.</Text>
          ) : (
            (() => {
              const v = db.invoices.find((v) => v.id === form.id);
              return v ? (
                <>
                  <InvoiceContent invoice={v} />
                  {modal === 'Thanh toán đơn chờ' && <PaymentForm actorId={user!.id} invoiceId={v.id} onPaid={()=>{setModal('');setCart({});setDraftId('');setCustomer('');setVoucher('');refresh(n=>n+1);setNotice('Đã thanh toán hóa đơn.');}}/>}
                </>
              ) : null;
            })()
          )}
        </Sheet>
      )}
    </View>
  );
}
