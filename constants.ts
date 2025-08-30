import { TransactionCategory, MockSms } from './types';
import { GroceriesIcon, TransportIcon, BillsIcon, EntertainmentIcon, SalaryIcon, OtherIcon } from './components/icons';

export const CATEGORIES: TransactionCategory[] = [
    { id: 1, name: 'حقوق', icon: SalaryIcon },
    { id: 2, name: 'خواروبار', icon: GroceriesIcon },
    { id: 3, name: 'حمل و نقل', icon: TransportIcon },
    { id: 4, name: 'قبوض', icon: BillsIcon },
    { id: 5, name: 'سرگرمی', icon: EntertainmentIcon },
    { id: 6, name: 'متفرقه', icon: OtherIcon },
];


export const MOCK_SMS_MESSAGES: MockSms[] = [
  {
    id: 1,
    sender: "Bank Mellat",
    text: "برداشت\nمبلغ: 550,000 ریال\nاز: ...6037\nمانده: 12,340,000 ریال\nتاریخ: 1403/05/01 18:45"
  },
  {
    id: 2,
    sender: "Bank Melli",
    text: "واریز مبلغ 25,000,000 ریال به حساب ...1234 در تاریخ 1403/05/02 با موفقیت انجام شد."
  },
  {
    id: 3,
    sender: "Blubank",
    text: "خرید با کارت\nمبلغ: 1,200,000 ریال\nفروشگاه افق کوروش\nمانده: 4,500,000 ریال\n1403/05/03 - 11:20"
  },
  {
    id: 4,
    sender: "Bank Pasargad",
    text: "برداشت از کارت\nمبلغ: 2,000,000 ریال\nمانده حساب: 8,750,000 ریال\n1403/05/04 09:00"
  },
  {
    id: 5,
    sender: "Saman Bank",
    text: "تراکنش کارت\nبرداشت: 350,000 ریال\nمانده: 2,150,000 ریال\nبابت خرید از اسنپ فود"
  },
  {
    id: 6,
    sender: "Bank Ayandeh",
    text: "انتقال پایا\nمبلغ: 7,500,000 ریال\nاز حساب ...5678\nبه دلیل: اجاره ماهانه\nتاریخ: 1403/05/06 10:00"
  }
];