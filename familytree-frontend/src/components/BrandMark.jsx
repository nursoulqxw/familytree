export default function BrandMark({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="#5a5a40" />
      <path
        d="M16 24V17M16 17C16 17 10.5 15.5 10.5 11C10.5 8.5 12.3 7 14 7.5C14 5.8 15.3 4.5 16 4.5C16.7 4.5 18 5.8 18 7.5C19.7 7 21.5 8.5 21.5 11C21.5 15.5 16 17 16 17Z"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="25.2" r="1.6" fill="#fff" />
      <circle cx="12" cy="27.5" r="1.6" fill="#fff" />
      <circle cx="20" cy="27.5" r="1.6" fill="#fff" />
      <path d="M16 24v1.2M13.2 26.2 16 24M18.8 26.2 16 24" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
