import { Users, Briefcase, Layers, Mail, UserCog, MessageSquare } from "lucide-react";
import React from "react";

import { Link } from "@/shared/lib/inertia";

const QuickActions: React.FC = () => {
  const actions = [
    {
      name: "Kelola Akun",
      icon: <Users className="w-4 h-4 mr-2" />,
      href: "/super-admin/accounts",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      name: "Kelola Rekruitmen",
      icon: <Briefcase className="w-4 h-4 mr-2" />,
      href: "/super-admin/recruitment",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      name: "Kelola Divisi",
      icon: <Layers className="w-4 h-4 mr-2" />,
      href: "/super-admin/kelola-divisi",
      color: "bg-cyan-600 hover:bg-cyan-700",
    },
    {
      name: "Kelola Surat",
      icon: <Mail className="w-4 h-4 mr-2" />,
      href: "/super-admin/kelola-surat",
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      name: "Kelola Staff",
      icon: <UserCog className="w-4 h-4 mr-2" />,
      href: "/super-admin/kelola-staff",
      color: "bg-blue-800 hover:bg-blue-900",
    },
    {
      name: "Kelola Pengaduan",
      icon: <MessageSquare className="w-4 h-4 mr-2" />,
      href: "/super-admin/kelola-pengaduan",
      color: "bg-gray-700 hover:bg-gray-800",
    },
  ];

  return (
    <div className="w-full py-4 px-6">
      <div className="flex justify-center flex-wrap gap-3 max-w-7xl mx-auto">
        {actions.map((action) => (
          <Link
            key={action.name}
            href={action.href}
            className={`flex items-center text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 ${action.color}`}
          >
            {action.icon}
            {action.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;



