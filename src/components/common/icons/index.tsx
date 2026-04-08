import { cn } from '@/lib/utils';

// ── Shared prop types ──

interface IconProps {
  size?: number;
  className?: string;
}

interface IconWithColorProps extends IconProps {
  color?: string;
}

interface IconWithStatusProps extends IconProps {
  status?: 'pass' | 'fail' | 'pending';
}

interface IconWithStrokeProps extends IconProps {
  stroke?: string;
}

// ═══════════════════════════════════════════════════════
//  PROJECT / NAVIGATION ICONS
// ═══════════════════════════════════════════════════════

export function ProjectLogo({ size = 25, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size * 0.989}
      viewBox="0 0 25 25"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect width="25" height="24.7283" rx="5.40541" fill="black" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.49797 4.36096C4.91615 4.4374 4.52883 5.01418 4.38341 6.02087C4.33013 6.38964 4.3378 7.50899 4.39708 8.02049C4.53903 9.24497 4.81461 10.551 5.17865 11.7245C5.39173 12.4113 5.38174 12.3656 5.34427 12.4809C4.86196 13.9642 4.54955 15.365 4.39655 16.7302C4.33777 17.2549 4.33062 18.3486 4.38355 18.7164C4.50595 19.5668 4.78818 20.0913 5.23572 20.3C5.38956 20.3718 5.43604 20.3805 5.66668 20.3805C6.08877 20.3805 6.4655 20.2229 7.0007 19.8221C7.25577 19.6312 7.9269 18.9874 8.28334 18.5918L8.55278 18.2927L8.96776 18.6995C9.87815 19.592 10.6821 20.0691 11.6967 20.3192C11.8496 20.3569 12.0084 20.3662 12.4998 20.3666C13.0863 20.3671 13.1251 20.3638 13.4118 20.2904C14.3622 20.0471 15.1589 19.5616 16.0488 18.6835C16.2714 18.4639 16.4557 18.2879 16.4585 18.2923C16.5132 18.381 17.0841 18.9861 17.3904 19.28C18.2259 20.0819 18.7561 20.3805 19.3442 20.3805C19.5803 20.3805 19.6111 20.3739 19.7912 20.2851C20.2256 20.0708 20.494 19.5606 20.6163 18.7164C20.6635 18.3905 20.664 17.2862 20.6172 16.851C20.4698 15.4818 20.1692 14.0732 19.74 12.7406C19.6808 12.5567 19.6324 12.3893 19.6324 12.3686C19.6324 12.3479 19.6808 12.1805 19.74 11.9967C20.1692 10.6641 20.4698 9.25548 20.6172 7.88627C20.664 7.45104 20.6635 6.34672 20.6163 6.02087C20.4972 5.19914 20.2194 4.66168 19.808 4.45724C19.6337 4.3706 19.5296 4.34962 19.2877 4.35239C18.7715 4.35833 18.1607 4.71325 17.3924 5.4538C17.1054 5.73034 16.4971 6.37582 16.4588 6.44449C16.4564 6.44863 16.266 6.26744 16.0357 6.04178C15.446 5.4641 14.9604 5.10307 14.3891 4.81747C13.722 4.48409 13.1872 4.35242 12.4998 4.35242C12.0423 4.35242 11.6914 4.40765 11.2653 4.54667C10.4665 4.80731 9.74793 5.27375 8.96776 6.03801L8.55278 6.44456L8.28362 6.14549C7.93255 5.75539 7.25795 5.10873 7.00014 4.91514C6.68468 4.67824 6.37332 4.50534 6.12494 4.42911C5.86251 4.34858 5.71463 4.33248 5.49797 4.36096ZM6.13041 5.01726C6.25722 5.07732 6.48958 5.22188 6.64682 5.33851C6.96684 5.57593 7.56622 6.15364 7.94874 6.59344L8.2016 6.88414L8.13592 6.96919C7.21427 8.16229 6.36599 9.73 5.70811 11.4561C5.68336 11.521 5.69482 11.5519 5.54642 11.0202C5.29818 10.1308 5.08454 9.06696 4.96761 8.13765C4.93038 7.84207 4.91913 7.55789 4.91941 6.92001C4.91976 6.15485 4.92478 6.06545 4.98177 5.80775C5.04984 5.50007 5.19285 5.16493 5.3074 5.04473C5.48984 4.85324 5.76472 4.84408 6.13041 5.01726ZM13.0544 4.93539C13.7088 5.04826 14.381 5.36695 15.0375 5.87555C15.2737 6.0585 16.0661 6.83178 16.0661 6.8793C16.0661 6.89758 15.9823 7.01691 15.88 7.14444C15.1963 7.99596 14.3204 9.21093 13.1045 10.9943L12.5043 11.8746L12.3296 11.6251C12.2335 11.4878 11.9241 11.0373 11.642 10.624C10.7028 9.2477 9.89266 8.12427 9.25609 7.3154C9.0787 7.08997 8.93358 6.89247 8.93358 6.87647C8.93358 6.82601 9.78064 6.01206 10.0225 5.83007C10.664 5.34739 11.3015 5.04919 11.9362 4.93473C12.2121 4.885 12.7641 4.88531 13.0544 4.93539ZM19.5311 4.93052C19.7952 5.04193 19.984 5.46669 20.0677 6.13747C20.1054 6.44 20.1055 7.33838 20.0678 7.75419C20.0218 8.26119 19.9361 8.86545 19.8339 9.40276C19.7428 9.88237 19.4671 11.0224 19.3644 11.3447L19.3143 11.5017L19.1436 11.077C18.4957 9.46518 17.6987 8.03625 16.8226 6.91549C16.79 6.87374 17.1895 6.41629 17.6859 5.92694C18.2163 5.40407 18.6748 5.07227 19.0603 4.9321C19.1881 4.88566 19.423 4.8849 19.5311 4.93052ZM9.12006 8.04216C9.88134 9.04491 10.6964 10.1995 11.9753 12.0868L12.1663 12.3686L11.4767 13.3809C10.687 14.5402 10.198 15.2383 9.66665 15.9652C9.19023 16.617 8.60087 17.3809 8.56589 17.392C8.51749 17.4073 8.01183 16.6762 7.63489 16.0458C7.05552 15.0768 6.37587 13.5986 6.02413 12.5423L5.96577 12.3671L6.05862 12.0994C6.60245 10.5321 7.45455 8.8452 8.28853 7.68496C8.48874 7.40642 8.55338 7.33344 8.58356 7.35182C8.59628 7.3596 8.83772 7.67024 9.12006 8.04216ZM16.6682 7.62487C17.5324 8.82581 18.3388 10.4057 18.9247 12.0456L19.0394 12.3666L18.978 12.5421C18.4821 13.9605 17.7313 15.5211 17.0343 16.5826C16.8206 16.908 16.465 17.4006 16.4434 17.4009C16.4195 17.4013 15.9038 16.7393 15.4609 16.1397C14.9697 15.4747 14.3494 14.5912 13.5199 13.3752L12.8333 12.3686L13.0243 12.0868C13.5213 11.3536 14.5606 9.84871 14.8781 9.40276C15.5217 8.49864 16.4027 7.33565 16.4434 7.33634C16.453 7.33651 16.5542 7.46635 16.6682 7.62487ZM14.1279 15.2271C14.7998 16.1818 15.439 17.045 15.8796 17.5928C15.9822 17.7204 16.0661 17.8386 16.0661 17.8556C16.0661 17.909 15.3569 18.6057 15.0724 18.8318C13.344 20.2055 11.5666 20.1866 9.85915 18.7764C9.58978 18.5539 8.93358 17.9016 8.93358 17.8562C8.93358 17.8419 9.0604 17.6703 9.21536 17.4748C9.81481 16.7188 10.6595 15.5512 11.5599 14.234C11.8273 13.8428 12.1492 13.3742 12.2752 13.1927L12.5042 12.8626L13.1319 13.7832C13.4771 14.2895 13.9253 14.9393 14.1279 15.2271ZM5.86721 13.6857C6.49232 15.2216 7.20954 16.5324 8.00693 17.5962L8.20339 17.8583L7.92873 18.1648C7.10624 19.0826 6.47482 19.6121 6.00005 19.782C5.80324 19.8524 5.5651 19.8628 5.45444 19.8058C5.25692 19.7041 5.081 19.3779 4.98177 18.9295C4.92478 18.6718 4.91976 18.5824 4.91941 17.8172C4.91913 17.1794 4.93038 16.8952 4.96761 16.5996C5.04045 16.0208 5.16442 15.3067 5.28668 14.7615C5.39485 14.2792 5.67022 13.2354 5.68536 13.2503C5.68967 13.2545 5.77152 13.4505 5.86721 13.6857ZM19.577 14.1938C19.9304 15.5941 20.0965 16.7565 20.097 17.8327C20.0975 18.8081 19.9705 19.3868 19.6891 19.6918C19.5854 19.8041 19.4896 19.8437 19.3212 19.8437C19.0413 19.8437 18.6743 19.6622 18.2167 19.2977C17.7687 18.9407 16.7725 17.886 16.8226 17.8218C17.6989 16.7008 18.484 15.2938 19.1437 13.6623L19.3151 13.2382L19.3648 13.3939C19.3921 13.4795 19.4876 13.8395 19.577 14.1938Z"
        fill="white"
      />
    </svg>
  );
}

export function SearchIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M14.9561 15.024L17.04 17.04M16.368 11.664C16.368 14.2619 14.2619 16.368 11.664 16.368C9.06601 16.368 6.95996 14.2619 6.95996 11.664C6.95996 9.06601 9.06601 6.95996 11.664 6.95996C14.2619 6.95996 16.368 9.06601 16.368 11.664Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SidebarFoldIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 8H7C6.44772 8 6 8.44772 6 9V14.5C6 15.0523 6.44772 15.5 7 15.5H8.5C9.05228 15.5 9.5 15.0523 9.5 14.5V9C9.5 8.44772 9.05228 8 8.5 8Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
    </svg>
  );
}

export function SidebarFoldRightIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8H15C14.4477 8 14 8.44772 14 9V14.5C14 15.0523 14.4477 15.5 15 15.5H17C17.5523 15.5 18 15.0523 18 14.5V9C18 8.44772 17.5523 8 17 8Z"
        fill="currentColor"
        fillOpacity="0.7"
      />
    </svg>
  );
}

export function MergeIcon({ size = 21.6, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect width="21.6" height="21.6" rx="3.6" fill="white" />
      <path
        d="M12.425 13.05C12.425 13.7956 13.0284 14.4 13.7727 14.4C14.5171 14.4 15.1205 13.7956 15.1205 13.05C15.1205 12.3045 14.5171 11.7 13.7727 11.7C13.0284 11.7 12.425 12.3045 12.425 13.05ZM12.425 13.05H11.0777C9.29415 13.05 7.84834 11.6018 7.84834 9.81529V9.17262M7.84834 9.00073V9.17262M7.84834 9.17262V16.2M9.17592 7.65005C9.17592 8.39563 8.57252 9.00005 7.8282 9.00005C7.08387 9.00005 6.48047 8.39563 6.48047 7.65005C6.48047 6.90446 7.08387 6.30005 7.8282 6.30005C8.57252 6.30005 9.17592 6.90446 9.17592 7.65005Z"
        stroke="black"
        strokeWidth="1.08"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FocusIcon({ size = 21.6, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect width="21.6" height="21.6" rx="3.6" fill="white" />
      <path
        d="M9.18043 5.93994H7.02043C6.42396 5.93994 5.94043 6.42347 5.94043 7.01994V9.17994M9.18043 15.6599H7.02043C6.42396 15.6599 5.94043 15.1764 5.94043 14.5799V12.4199M12.4204 5.93994H14.5804C15.1769 5.93994 15.6604 6.42347 15.6604 7.01994V9.17994M15.6604 12.4199V14.5799C15.6604 15.1764 15.1769 15.6599 14.5804 15.6599H12.4204M9.58543 12.6224H12.0154C12.3509 12.6224 12.6229 12.3505 12.6229 12.0149V9.58494C12.6229 9.24943 12.3509 8.97744 12.0154 8.97744H9.58543C9.24992 8.97744 8.97793 9.24943 8.97793 9.58494V12.0149C8.97793 12.3505 9.24992 12.6224 9.58543 12.6224Z"
        stroke="black"
        strokeWidth="1.08"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIcon({ size = 21.6, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect width="21.6" height="21.6" rx="3.6" fill="white" />
      <path
        d="M10.8001 6.91211L10.8001 14.6881M14.6881 10.8001L6.91211 10.8001"
        stroke="black"
        strokeWidth="1.08"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PlusIconSmall({ size = 24, stroke = 'white', className }: IconWithStrokeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M10.8001 6.91211L10.8001 14.6881M14.6881 10.8001L6.91211 10.8001"
        stroke={stroke}
        strokeWidth="1.08"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M10.1996 17.4001V13.2918C10.1996 12.9136 10.522 12.6071 10.9196 12.6071H13.0796C13.4773 12.6071 13.7996 12.9136 13.7996 13.2918V17.4001M11.5824 6.7268L6.90235 9.89172C6.71242 10.0202 6.59961 10.2281 6.59961 10.4497V16.373C6.59961 16.9403 7.08314 17.4001 7.67961 17.4001H16.3196C16.9161 17.4001 17.3996 16.9403 17.3996 16.373V10.4497C17.3996 10.2281 17.2868 10.0202 17.0969 9.89172L12.4169 6.7268C12.1671 6.55786 11.8322 6.55786 11.5824 6.7268Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronDownIcon({ size = 12, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M3 4.5L6 7.5L9 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PackageIcon({ size = 24, color = '#f97316', className }: IconWithColorProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InterfaceIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M11.9811 15.4162V17.8598M9.88654 7.38712V6.33984M14.0756 7.38712V6.33984M16.1702 9.83075H7.79199M8.83927 9.83075H15.1229V12.6235C15.1229 14.1659 13.8726 15.4162 12.3302 15.4162H11.632C10.0896 15.4162 8.83927 14.1659 8.83927 12.6235V9.83075Z"
        stroke="#6E6E6E"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
//  CUBE / DATA ICONS (from App.jsx canvas icons)
// ═══════════════════════════════════════════════════════

export function CubeIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn('shrink-0', className)}
    >
      <polygon
        points="8,2 13,5.5 8,8 3,5.5"
        fill="#f9731640"
        stroke="#f97316"
        strokeWidth="1"
      />
      <polygon
        points="8,8 13,5.5 13,10.5 8,14"
        fill="#f9731625"
        stroke="#f97316"
        strokeWidth="1"
      />
      <polygon
        points="8,8 3,5.5 3,10.5 8,14"
        fill="#f9731630"
        stroke="#f97316"
        strokeWidth="1"
      />
    </svg>
  );
}

export function ReqIcon({ size = 12, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn('shrink-0', className)}
    >
      <rect x="2" y="1" width="12" height="14" rx="2" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.2" />
      <line x1="5" y1="5" x2="11" y2="5" stroke="#3b82f6" strokeWidth="1.2" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="#3b82f6" strokeWidth="1.2" />
      <line x1="5" y1="11" x2="9" y2="11" stroke="#3b82f6" strokeWidth="1.2" />
    </svg>
  );
}

export function TestIcon({ status, size = 11, className }: IconWithStatusProps) {
  const c =
    status === 'pass'
      ? { fill: '#dcfce7', stroke: '#16a34a' }
      : status === 'fail'
        ? { fill: '#fee2e2', stroke: '#dc2626' }
        : { fill: '#fef9c3', stroke: '#ca8a04' };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn('shrink-0', className)}
    >
      <path
        d="M6.5 2h3v4l2.5 5.5a1 1 0 01-.9 1.5H4.9a1 1 0 01-.9-1.5L6.5 6V2z"
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line
        x1="5.5"
        y1="1.5"
        x2="10.5"
        y2="1.5"
        stroke={c.stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VerifyIcon({
  status,
  size = 16,
  className,
}: IconWithStatusProps) {
  const cfg = {
    pass: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '\u2713' },
    fail: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '\u2715' },
    pending: { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: '\u25CB' },
  };
  const c = cfg[status || 'pending'] || cfg.pending;
  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0 rounded-full font-bold leading-none', className)}
      style={{
        width: size,
        height: size,
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        fontSize: size * 0.55,
        color: c.color,
      }}
    >
      {c.icon}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
//  SVG REQUIREMENT / TEST / DOCUMENT / DESIGN VALUE ICONS
// ═══════════════════════════════════════════════════════

export function SvgRequirementIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M13.8002 9.25L11.8684 11.1818C11.6927 11.3575 11.4077 11.3575 11.232 11.1818L10.2002 10.15"
        stroke="#0084D1"
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M7.5 15.55V7.58622C7.5 7.49738 7.5263 7.41053 7.57558 7.33661L8.26641 6.30036C8.34987 6.17517 8.49037 6.09998 8.64083 6.09998H16.05C16.2985 6.09998 16.5 6.30145 16.5 6.54998V14.2M7.5 15.55C7.5 15.55 8.10442 16.9 8.85 16.9C11.4001 16.9 14.8351 16.9 16.0508 16.9C16.2994 16.9 16.5 16.6985 16.5 16.45V14.2M7.5 15.55C7.5 15.55 8.10442 14.2 8.85 14.2C11.55 14.2 16.5 14.2 16.5 14.2"
        stroke="#0084D1"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
}

export function SvgTestIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn('shrink-0', className)}
    >
      <path
        d="M6.5 2h3v4l2.5 5.5a1 1 0 01-.9 1.5H4.9a1 1 0 01-.9-1.5L6.5 6V2z"
        fill="#fef9c3"
        stroke="#ca8a04"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line x1="5.5" y1="1.5" x2="10.5" y2="1.5" stroke="#ca8a04" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function SvgDocumentIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect x="6" y="4" width="12" height="16" rx="2" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="9" y1="9" x2="15" y2="9" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="9" y1="12" x2="15" y2="12" stroke="#94a3b8" strokeWidth="1.2" />
      <line x1="9" y1="15" x2="13" y2="15" stroke="#94a3b8" strokeWidth="1.2" />
    </svg>
  );
}

export function SvgDesignValueIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M11.6305 7.353C11.8345 7.14893 12.1654 7.14893 12.3694 7.353L16.6469 11.6305C16.851 11.8345 16.851 12.1654 16.6469 12.3694L12.3694 16.6469C12.1654 16.851 11.8345 16.851 11.6305 16.6469L7.353 12.3694C7.14893 12.1654 7.14893 11.8345 7.353 11.6305L11.6305 7.353Z"
        stroke="#f59e0b"
        strokeWidth="1.2"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
//  DETAIL VIEW ICONS
// ═══════════════════════════════════════════════════════

export function DVInterfaceIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M11.9811 15.4162V17.8598M9.88654 7.38712V6.33984M14.0756 7.38712V6.33984M16.1702 9.83075H7.79199M8.83927 9.83075H15.1229V12.6235C15.1229 14.1659 13.8726 15.4162 12.3302 15.4162H11.632C10.0896 15.4162 8.83927 14.1659 8.83927 12.6235V9.83075Z"
        stroke="#6E6E6E"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DVPackageIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M12 17.7604L16.9883 14.8804V9.12036L12 6.24036L7.01172 9.12036V14.8804L12 17.7604ZM12 17.7604V12.3604M12 12.3604L7.32003 9.48036M12 12.3604L16.68 9.48036"
        stroke="#f97316"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DVRequirementIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M13.8002 9.25L11.8684 11.1818C11.6927 11.3575 11.4077 11.3575 11.232 11.1818L10.2002 10.15"
        stroke="#0084D1"
        strokeWidth="1.2"
        fill="none"
      />
      <path
        d="M7.5 15.55V7.58622C7.5 7.49738 7.5263 7.41053 7.57558 7.33661L8.26641 6.30036C8.34987 6.17517 8.49037 6.09998 8.64083 6.09998H16.05C16.2985 6.09998 16.5 6.30145 16.5 6.54998V14.2M7.5 15.55C7.5 15.55 8.10442 16.9 8.85 16.9C11.4001 16.9 14.8351 16.9 16.0508 16.9C16.2994 16.9 16.5 16.6985 16.5 16.45V14.2M7.5 15.55C7.5 15.55 8.10442 14.2 8.85 14.2C11.55 14.2 16.5 14.2 16.5 14.2"
        stroke="#0084D1"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
}

export function DVArrowIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M5 12H19M19 12L14 7M19 12L14 17"
        stroke="#151414"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DVUserIcon({ size = 30, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect
        x="0.625"
        y="0.625"
        width="28.75"
        height="28.75"
        rx="14.375"
        stroke="#8A8A8A"
        strokeWidth="1.25"
        strokeDasharray="2.5 2.5"
      />
      <path
        d="M15 16.167C16.779 16.167 18.3529 16.5069 19.4541 17.0234C20.6145 17.5678 20.9998 18.1709 21 18.583C21 19.1052 20.7159 19.676 19.793 20.1572C18.8449 20.6514 17.294 21 15 21C12.706 21 11.1551 20.6514 10.207 20.1572C9.28408 19.676 9 19.1052 9 18.583C9.00025 18.1709 9.38547 17.5678 10.5459 17.0234C11.6471 16.5069 13.221 16.167 15 16.167ZM15 9C16.1129 9 17.1131 10.0844 17.1133 11.2568C17.1133 12.3936 16.147 13.4062 15 13.4062C13.853 13.4062 12.8867 12.3936 12.8867 11.2568C12.8869 10.0844 13.8871 9 15 9Z"
        stroke="#8A8A8A"
        strokeWidth="1.5"
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
//  AI CHAT ICONS
// ═══════════════════════════════════════════════════════

export function FlowAILogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.69327 0.0195446C0.836829 0.133976 0.266695 0.997389 0.0526239 2.50435C-0.0258018 3.05639-0.0145023 4.732 0.0727462 5.49769C0.281709 7.33066 0.687356 9.28568 1.22323 11.0424C1.53688 12.0704 1.52218 12.0021 1.46702 12.1747C0.757062 14.3951 0.297188 16.492 0.0719723 18.5357C-0.0145539 19.3211-0.0250794 20.9583 0.0528303 21.5089C0.233003 22.7819 0.648452 23.5671 1.30723 23.8795C1.53368 23.9869 1.6021 24 1.9416 24C2.56292 24 3.11747 23.764 3.90528 23.1642C4.28075 22.8783 5.26865 21.9146 5.79333 21.3224L6.18995 20.8747L6.80079 21.4836C8.14089 22.8196 9.32424 23.5338 10.8178 23.9082C11.0429 23.9646 11.2766 23.9786 12 23.9792C12.8633 23.9799 12.9204 23.975 13.3424 23.8651C14.7414 23.5009 15.9142 22.7742 17.2241 21.4597C17.5518 21.1309 17.8231 20.8674 17.8271 20.874C17.9077 21.0069 18.748 21.9127 19.1989 22.3526C20.4287 23.5529 21.2093 24 22.075 24C22.4225 24 22.4678 23.9901 22.7329 23.8572C23.3723 23.5364 23.7674 22.7726 23.9474 21.5089C24.0169 21.0211 24.0177 19.368 23.9487 18.7165C23.7318 16.6669 23.2893 14.5582 22.6575 12.5634C22.5704 12.2882 22.4991 12.0376 22.4991 12.0066C22.4991 11.9756 22.5704 11.7251 22.6575 11.4498C23.2893 9.455 23.7318 7.34639 23.9487 5.29676C24.0177 4.64524 24.0169 2.99213 23.9474 2.50435C23.7722 1.27426 23.3633 0.469719 22.7577 0.163671C22.501 0.033978 22.3478 0.00257644 21.9918 0.00671503C21.2319 0.015613 20.3328 0.546904 19.2018 1.65548C18.7794 2.06944 17.884 3.03569 17.8275 3.13849C17.8241 3.14469 17.5439 2.87346 17.2048 2.53565C16.3368 1.67089 15.622 1.13044 14.781 0.702928C13.7991 0.203867 13.0118 0.00676676 12 0.00676676C11.3265 0.00676676 10.81 0.089435 10.1828 0.297554C9.00697 0.687719 7.94921 1.38595 6.80079 2.53001L6.18995 3.13859L5.79374 2.6909C5.27696 2.10694 4.28395 1.13893 3.90446 0.849124C3.4401 0.494499 2.98177 0.235682 2.61616 0.121561C2.22986 0.00102447 2.01218-0.0230828 1.69327 0.0195446Z"
        fill="black"
      />
    </svg>
  );
}

export function StarIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M11.3348 6.70351C11.5634 6.08581 12.4371 6.08581 12.6656 6.70351L13.8033 9.77799C13.8752 9.97219 14.0283 10.1253 14.2225 10.1972L17.297 11.3348C17.9147 11.5634 17.9147 12.4371 17.297 12.6656L14.2225 13.8033C14.0283 13.8752 13.8752 14.0283 13.8033 14.2225L12.6656 17.297C12.4371 17.9147 11.5634 17.9147 11.3348 17.297L10.1972 14.2225C10.1253 14.0283 9.97219 13.8752 9.77799 13.8033L6.70351 12.6656C6.08581 12.4371 6.08581 11.5634 6.70351 11.3348L9.77799 10.1972C9.97219 10.1253 10.1253 9.97219 10.1972 9.77799L11.3348 6.70351Z"
        stroke="#151414"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AttachIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M16.174 11.7034L11.9467 15.9307C10.7962 17.0812 9.07061 17.2171 7.89752 16.044C6.74694 14.8934 6.89648 13.2266 8.06957 12.0535L12.8215 7.30159C13.5487 6.57432 14.7196 6.57431 15.4468 7.30158C16.1741 8.02885 16.1741 9.19969 15.4468 9.92696L10.6115 14.7623C10.249 15.1248 9.66131 15.1248 9.29882 14.7623C8.93633 14.3998 8.93633 13.8121 9.29882 13.4496L13.6095 9.1389"
        stroke="#C1C1C1"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SendIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <rect width="24" height="24" rx="6" fill="#E4E4E4" />
      <path
        d="M7.7998 11.1992L11.9998 7.19922M11.9998 7.19922L16.1998 11.1992M11.9998 7.19922V16.7992"
        stroke="black"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlusCircleIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M12 8.40002V15.6M8.40002 12H15.6"
        stroke="#151414"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DotsIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path d="M7.59971 10.0008C7.59971 10.6635 7.06245 11.2008 6.39971 11.2008C5.73697 11.2008 5.19971 10.6635 5.19971 10.0008C5.19971 9.33804 5.73697 8.80078 6.39971 8.80078C7.06245 8.80078 7.59971 9.33804 7.59971 10.0008Z" fill="black" />
      <path d="M11.1997 10.0008C11.1997 10.6635 10.6624 11.2008 9.99971 11.2008C9.33697 11.2008 8.79971 10.6635 8.79971 10.0008C8.79971 9.33804 9.33697 8.80078 9.99971 8.80078C10.6624 8.80078 11.1997 9.33804 11.1997 10.0008Z" fill="black" />
      <path d="M14.7997 10.0008C14.7997 10.6635 14.2624 11.2008 13.5997 11.2008C12.937 11.2008 12.3997 10.6635 12.3997 10.0008C12.3997 9.33804 12.937 8.80078 13.5997 8.80078C14.2624 8.80078 14.7997 9.33804 14.7997 10.0008Z" fill="black" />
    </svg>
  );
}

export function DeleteIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M7.19995 8.50586H16.8M10.8 14.8588V11.047M13.2 14.8588V11.047M14.4 17.4H9.59995C8.93721 17.4 8.39995 16.8311 8.39995 16.1294V9.14115C8.39995 8.79029 8.66858 8.50586 8.99995 8.50586H15C15.3313 8.50586 15.6 8.79029 15.6 9.14115V16.1294C15.6 16.8311 15.0627 17.4 14.4 17.4ZM10.8 8.50586H13.2C13.5313 8.50586 13.8 8.22143 13.8 7.87056V7.23527C13.8 6.88441 13.5313 6.59998 13.2 6.59998H10.8C10.4686 6.59998 10.2 6.88441 10.2 7.23527V7.87056C10.2 8.22143 10.4686 8.50586 10.8 8.50586Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArchiveIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M6.6001 12.6849V15.4278C6.6001 16.1852 7.20451 16.7992 7.9501 16.7992H16.0501C16.7957 16.7992 17.4001 16.1852 17.4001 15.4278V12.6849M6.6001 12.6849L8.2966 8.08911C8.4942 7.55383 8.99791 7.19922 9.56065 7.19922H14.4395C15.0023 7.19922 15.506 7.55383 15.7036 8.08911L17.4001 12.6849M6.6001 12.6849H9.3001L10.2001 13.6449H13.8001L14.7001 12.6849H17.4001"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0', className)}
    >
      <path
        d="M15 9L9 15M9 9L15 15"
        stroke="#151414"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LinkIcon({ size = 12, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
    >
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="12" r="3" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  );
}
