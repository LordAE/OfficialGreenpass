
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, User as UserIcon, Shield, Briefcase, School, Store, BookOpen, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import InviteUserModal from '../components/admin/InviteUserModal';

const roleIcons = {
    admin: <Shield className="w-4 h-4 text-red-500" />,
    agent: <Briefcase className="w-4 h-4 text-blue-500" />,
    school: <School className="w-4 h-4 text-purple-500" />,
    tutor: <BookOpen className="w-4 h-4 text-green-500" />,
    vendor: <Store className="w-4 h-4 text-orange-500" />,
    student: <UserIcon className="w-4 h-4 text-gray-500" />,
    user: <UserIcon className="w-4 h-4 text-gray-500" />,
};

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            setLoading(true);
            try {
                const userData = await User.list('-created_date');
                setUsers(userData);
                setFilteredUsers(userData);
            } catch (error) {
                console.error("Error loading users:", error);
            }
            setLoading(false);
        };
        loadUsers();
    }, []);

    useEffect(() => {
        let filtered = users;
        if (searchTerm) {
            filtered = filtered.filter(user =>
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (roleFilter !== "all") {
            filtered = filtered.filter(user => user.user_type === roleFilter);
        }
        setFilteredUsers(filtered);
    }, [searchTerm, roleFilter, users]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin" /></div>;
    }

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
                    <p className="text-gray-600 mt-1">Invite users and manage platform access</p>
                </div>
                <Button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                >
                    <UserIcon className="w-4 h-4 mr-2" />
                    Invite New User
                </Button>
            </div>
            
            <InviteUserModal 
                isOpen={isInviteModalOpen} 
                onOpenChange={setIsInviteModalOpen} 
            />

            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <div className="mt-4 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                {Object.keys(roleIcons).map(role => (
                                    <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.full_name || 'N/A'}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 capitalize">
                                                {roleIcons[user.user_type] || <UserIcon className="w-4 h-4" />}
                                                {user.user_type}
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.country || 'N/A'}</TableCell>
                                        <TableCell>{format(new Date(user.created_date), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>{user.onboarding_completed ? 'Verified' : 'Pending'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>View details</DropdownMenuItem>
                                                    <DropdownMenuItem>Edit user</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="md:hidden grid grid-cols-1 gap-4">
                         {filteredUsers.map(user => (
                             <Card key={user.id} className="p-4">
                                 <div className="flex justify-between items-start">
                                     <div>
                                         <p className="font-bold">{user.full_name || 'N/A'}</p>
                                         <p className="text-sm text-gray-500">{user.email}</p>
                                     </div>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>View details</DropdownMenuItem>
                                            <DropdownMenuItem>Edit user</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                 </div>
                                 <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                                     <div className="flex items-center gap-2 capitalize">
                                        {roleIcons[user.user_type] || <UserIcon className="w-4 h-4" />}
                                        {user.user_type}
                                    </div>
                                    <div className="text-gray-600">
                                         Joined: {format(new Date(user.created_date), 'MMM yyyy')}
                                     </div>
                                 </div>
                             </Card>
                         ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
